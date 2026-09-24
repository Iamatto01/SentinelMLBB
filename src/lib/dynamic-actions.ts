import * as discord from 'discord.js';
import {
  Guild,
  GuildMember,
  TextBasedChannel,
  User,
  Client,
  Message,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  Colors,
  ComponentType,
} from 'discord.js';
import { db } from './db';

// ============================================================
// SENTINEL DYNAMIC AI ACTION EXECUTION ENGINE
// Enables Baby Hirara to autonomously generate and run Discord
// actions on-the-fly for any capability requested by server admins.
// ============================================================

export interface DynamicContext {
  guild: Guild | null;
  channel: any;
  author: User;
  member: GuildMember | null;
  botMember: GuildMember | null;
  client: Client;
  message: Message;
}

export interface DynamicExecutionResult {
  success: boolean;
  result?: any;
  output?: string;
  error?: string;
  durationMs: number;
}

/**
 * Initialize table for storing AI-generated custom reusable functions
 */
export async function initCustomFunctionsTable(): Promise<void> {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS custom_ai_functions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT,
        code TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.warn('[DynamicAction] Could not init custom_ai_functions table:', err);
  }
}

/**
 * Save a custom AI function for persistent reuse
 */
export async function saveCustomFunction(
  name: string,
  description: string,
  code: string,
  createdBy: string
): Promise<void> {
  await initCustomFunctionsTable();
  await db.execute({
    sql: `INSERT INTO custom_ai_functions (name, description, code, created_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       description = excluded.description,
       code = excluded.code,
       created_at = CURRENT_TIMESTAMP`,
    args: [name.trim().toLowerCase(), description.trim(), code.trim(), createdBy],
  });
}

/**
 * Retrieve a saved custom function by name
 */
export async function getCustomFunction(name: string): Promise<any | null> {
  await initCustomFunctionsTable();
  const res = await db.execute({
    sql: `SELECT * FROM custom_ai_functions WHERE name = ? LIMIT 1`,
    args: [name.trim().toLowerCase()],
  });
  return res.rows[0] || null;
}

/**
 * List all saved custom functions
 */
export async function listCustomFunctions(): Promise<any[]> {
  await initCustomFunctionsTable();
  const res = await db.execute(
    `SELECT name, description, created_by, created_at FROM custom_ai_functions ORDER BY created_at DESC`
  );
  return res.rows || [];
}

/**
 * Extract `discord-action` code block from AI response text
 */
export function extractDiscordActionCode(rawText: string): {
  code: string | null;
  explanationText: string;
} {
  if (!rawText) return { code: null, explanationText: '' };

  // Match ```discord-action ... ``` or ```javascript / ```js containing // discord-action
  const actionRegex = /```(?:discord-action|js|javascript)\s*\n([\s\S]*?)```/i;
  const match = rawText.match(actionRegex);

  if (match && match[1]) {
    const code = match[1].trim();
    // Verify it's intended as an action
    if (
      rawText.includes('```discord-action') ||
      code.includes('guild') ||
      code.includes('roles') ||
      code.includes('channel') ||
      code.includes('members')
    ) {
      const explanationText = rawText.replace(actionRegex, '').trim();
      return { code, explanationText };
    }
  }

  return { code: null, explanationText: rawText.trim() };
}

/**
 * Security Guardrails: Scan dynamic code for dangerous operations before execution
 */
export function validateActionCodeSafety(code: string): { safe: boolean; reason?: string } {
  const forbiddenPatterns: { pattern: RegExp; reason: string }[] = [
    { pattern: /\bprocess\b/i, reason: 'Akses kepada `process` atau `process.env` dilarang demi keselamatan.' },
    { pattern: /\b(?:token|client\.token|botMember\.client\.token)\b/i, reason: 'Akses kepada token rahsia bot dilarang.' },
    { pattern: /\b(?:eval|Function)\s*\(/i, reason: 'Penggunaan `eval()` atau constructor dinamik dilarang.' },
    { pattern: /\b(?:require|import)\s*[\(\{]/i, reason: 'Panggilan modul luaran (`require`/`import`) dilarang.' },
    { pattern: /\b(?:child_process|fs|net|http|https|os|path)\b/i, reason: 'Akses modul sistem fail/rangkaian Node.js dilarang.' },
    { pattern: /\b(?:client\.destroy|destroy\s*\()\b/i, reason: 'Pemberhentian klien bot (`client.destroy`) dilarang.' },
    { pattern: /\bguild\.delete\s*\(/i, reason: 'Operasi pemadaman pelayan (`guild.delete`) dilarang.' },
    { pattern: /\bdrop\s+table\b/i, reason: 'Operasi SQLite `DROP TABLE` dilarang.' },
    { pattern: /\bdelete\s+from\s+(?:users|custom_ai_functions)\b/i, reason: 'Pemadaman pangkalan data sistem dilarang.' },
  ];

  for (const { pattern, reason } of forbiddenPatterns) {
    if (pattern.test(code)) {
      return { safe: false, reason };
    }
  }

  return { safe: true };
}

/**
 * Safe Execution Sandbox for Dynamic Discord.js Code
 */
export async function executeDynamicDiscordAction(
  code: string,
  context: DynamicContext
): Promise<DynamicExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  const logHelper = (...args: any[]) => {
    logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  };

  // 1. Permission Validation
  if (context.guild) {
    const isOwner = context.guild.ownerId === context.author.id;
    const isOwnerByConfig = context.author.id === '1103825075809030186';
    const hasAdminPerm =
      context.member?.permissions.has(PermissionsBitField.Flags.Administrator) ||
      context.member?.permissions.has(PermissionsBitField.Flags.ManageGuild);

    if (!isOwner && !isOwnerByConfig && !hasAdminPerm) {
      return {
        success: false,
        error:
          '⛔ Kebenaran ditolak: Hanya pemilik server (Owner) atau pentadbir (Administrator) dibenarkan untuk menjalankan tindakan dinamik sistem ini.',
        durationMs: Date.now() - startTime,
      };
    }
  }

  // 2. Prepare Sandbox Scope & Security Validation
  const discordScope = {
    ...discord,
  };

  // Clean code if wrapped in an anonymous wrapper
  let cleanCode = code.trim();
  if (cleanCode.startsWith('```') && cleanCode.endsWith('```')) {
    cleanCode = cleanCode.replace(/^```[a-zA-Z0-9-]*\n/, '').replace(/\n```$/, '').trim();
  }

  // Pre-execution Security Check
  const securityCheck = validateActionCodeSafety(cleanCode);
  if (!securityCheck.safe) {
    return {
      success: false,
      error: `🛡️ Sekatan Keselamatan: ${securityCheck.reason}`,
      durationMs: Date.now() - startTime,
    };
  }

  // If code is an arrow function or function declaration, adapt it
  const isFunctionFormat = /^\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/i.test(cleanCode);

  const wrapperCode = isFunctionFormat
    ? `return await (${cleanCode})(params);`
    : `
      return await (async (params) => {
        const process = undefined;
        const global = undefined;
        const globalThis = undefined;
        const { guild, channel, author, member, botMember, client, message, discord, db, log } = params;
        ${cleanCode}
      })(params);
    `;

  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runner = new AsyncFunction('params', wrapperCode);

    const executionParams = {
      guild: context.guild,
      channel: context.channel,
      author: context.author,
      member: context.member,
      botMember: context.botMember,
      client: context.client,
      message: context.message,
      discord: discordScope,
      db,
      log: logHelper,
    };

    // Run with 30s timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Masa pelaksanaan melebihi had (Timeout 30 saat).')), 30000)
    );

    const executionPromise = runner(executionParams);
    const result = await Promise.race([executionPromise, timeoutPromise]);

    const durationMs = Date.now() - startTime;
    return {
      success: true,
      result,
      output: logs.length > 0 ? logs.join('\n') : undefined,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    console.error('[DynamicAction Error]:', err);
    return {
      success: false,
      error: err.message || String(err),
      output: logs.length > 0 ? logs.join('\n') : undefined,
      durationMs,
    };
  }
}
