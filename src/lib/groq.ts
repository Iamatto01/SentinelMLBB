// ============================================================
// LLM Client — Mini Server (OpenAI-compatible) + Turso Memory
// ============================================================

const API_BASE = process.env.LLM_API_BASE || 'https://bandelbanget.xyz/v1';
const API_KEY = process.env.LLM_API_KEY || '';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'deepseek-v4-flash';

// ── Model selection (persisted in Turso) ──────────────────────

export async function getActiveModel(): Promise<string> {
  try {
    const { db } = await import('./db');
    await db.execute("CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)");
    const res = await db.execute({
      sql: "SELECT value FROM system_settings WHERE key = :key",
      args: { key: 'active_model' }
    });
    const storedModel = res.rows?.[0]?.value as string | undefined;
    if (storedModel && storedModel !== 'auto') return storedModel;
  } catch (e) {
    console.error("[LLM] getActiveModel error:", e);
  }
  return DEFAULT_MODEL;
}

export async function setActiveModel(modelName: string): Promise<void> {
  const { db } = await import('./db');
  await db.execute("CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)");
  await db.execute({
    sql: "INSERT INTO system_settings (key, value) VALUES (:key, :value) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: { key: 'active_model', value: modelName }
  });
}

// ── Conversation Memory (Turso) ───────────────────────────────

export async function getConversationMemory(sessionId: string, limit = 10) {
  try {
    const { db } = await import('./db');
    await db.execute(`CREATE TABLE IF NOT EXISTS conversation_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT, role TEXT, content TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    const res = await db.execute({
      sql: "SELECT role, content FROM conversation_memory WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
      args: [sessionId, limit * 2]
    });
    return res.rows.reverse().map(r => ({ role: r.role as string, content: r.content as string }));
  } catch (e) {
    console.warn('[Memory] Turso unavailable, returning empty:', e);
    return [];
  }
}

export async function saveConversationMemory(sessionId: string, role: string, content: string) {
  try {
    const { db } = await import('./db');
    await db.execute({
      sql: "INSERT INTO conversation_memory (session_id, role, content) VALUES (?, ?, ?)",
      args: [sessionId, role, content]
    });
  } catch (e) {
    console.warn('[Memory] Turso unavailable, skipping save:', e);
  }
}

// ── Groq fallback keys ────────────────────────────────────────

function getGroqKeys(): string[] {
  const keys = [
    process.env.GROQ_API_KEY,
    ...(process.env.GROQ_API_KEYS?.split(',').map(k => k.trim()) || []),
  ].filter((k): k is string => !!k);
  return [...new Set(keys)];
}

async function createChatCompletionViaGroq(params: any) {
  const { default: Groq } = await import('groq-sdk');
  const groqKeys = getGroqKeys();
  if (groqKeys.length === 0) {
    throw new Error("No GROQ_API_KEY found in environment variables");
  }
  const groqParams = {
    ...params,
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  };
  let lastErr: any;
  for (const key of groqKeys) {
    try {
      const client = new Groq({ apiKey: key });
      return await client.chat.completions.create(groqParams as any);
    } catch (e: any) {
      console.warn(`[Groq] Key call failed: ${e.message}`);
      lastErr = e;
    }
  }
  throw lastErr || new Error("All Groq keys failed");
}

// ── OpenAI-compatible chat completion (mini server, fallback Groq) ──

async function createChatCompletion(params: any) {
  // Try mini server first
  const model = params.model || DEFAULT_MODEL;
  const body: any = {
    model,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens ?? 1024,
  };
  if (params.tools) {
    body.tools = params.tools;
    body.tool_choice = params.tool_choice ?? 'auto';
  }

  try {
    const apiBase = process.env.LLM_API_BASE || 'https://bandelbanget.xyz/v1';
    const apiKey = process.env.LLM_API_KEY || '';
    const res = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    console.warn(`[LLM] Primary server (${apiBase}) returned ${res.status}, falling back to Groq`);
  } catch (e) {
    console.warn('[LLM] Primary server unreachable, falling back to Groq');
  }

  // Fallback to Groq
  const groqKeys = getGroqKeys();
  if (groqKeys.length > 0) {
    console.log('[LLM] → Executing Groq fallback');
    return createChatCompletionViaGroq(params);
  }

  throw new Error('No LLM provider available (mini server down + no Groq keys)');
}

// ── Default export (same interface as old groq) ───────────────

const llm = {
  chat: { completions: { create: createChatCompletion } },
  getActiveModel,
  setActiveModel,
  getConversationMemory,
  saveConversationMemory,
} as any;

export default llm;
