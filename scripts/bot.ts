import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonInteraction,
  StringSelectMenuInteraction,
  PollLayoutType,
} from 'discord.js';
import type { PollData } from 'discord.js';
import dotenv from 'dotenv';
import {
  getUserHiraraContext,
  recordChatMessage,
  extractAndLearnMemories,
  createReminder,
  getDueReminders,
  markReminderDone,
  getUserPendingReminders,
  initHiraraDatabase,
  isUserAuthorizedForGitHub,
  grantGitHubAccess,
  cleanModelOutput,
} from '../src/lib/memory';
import {
  listUserRepositories,
  getDefaultGitHubUsername,
  getGitHubReposContext,
} from '../src/lib/github';
import { llm } from '../src/lib/groq';
import { db } from '../src/lib/db';
import { ALL_HEROES } from '../src/data/heroes-data';
import { HEROES } from '../src/lib/heroData';

dotenv.config({ path: '.env.local' });

// ============================================================
// SENTINEL MLBB — DEDICATED SPECIALIZED DISCORD BOT CORE
// Powering Slash Commands, Live Autocomplete, Interactive UI,
// Match Stats Engine, and AI Squad Coaching Companion
// ============================================================

// ── Safe Discord reply (Auto-splits messages exceeding 1900 chars) ──
async function safeDiscordReply(message: any, rawText: string): Promise<void> {
  const text = cleanModelOutput(rawText) || 'Hai! Ada apa yang boleh saya bantu?';

  if (text.length <= 1900) {
    await message.reply({
      content: text,
      allowedMentions: { repliedUser: true, parse: [] },
    });
    return;
  }

  // Split into chunks <= 1900 chars
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= 1900) {
      chunks.push(remaining);
      break;
    }

    let splitIdx = remaining.lastIndexOf('\n\n', 1900);
    if (splitIdx === -1 || splitIdx < 500) {
      splitIdx = remaining.lastIndexOf('\n', 1900);
    }
    if (splitIdx === -1 || splitIdx < 500) {
      splitIdx = remaining.lastIndexOf('. ', 1900);
      if (splitIdx !== -1) splitIdx += 1;
    }
    if (splitIdx === -1 || splitIdx < 500) {
      splitIdx = remaining.lastIndexOf(' ', 1900);
    }
    if (splitIdx === -1) {
      splitIdx = 1900;
    }

    chunks.push(remaining.substring(0, splitIdx).trim());
    remaining = remaining.substring(splitIdx).trim();
  }

  if (chunks.length > 0) {
    await message.reply({
      content: chunks[0],
      allowedMentions: { repliedUser: true, parse: [] },
    });
    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i] && chunks[i].length > 0) {
        await message.channel.send({
          content: chunks[i],
          allowedMentions: { parse: [] },
        });
      }
    }
  }
}

// ── Smart Natural Timer / Reminder Parser ─────────────────────
function parseSmartReminder(rawPrompt: string): {
  remindAtMs: number;
  reminderText: string;
  timeFormatted: string;
} | null {
  const text = rawPrompt.toLowerCase().trim();

  // Expanded trigger keywords — covers natural Malaysian phrasing
  const isExplicitTimer =
    /\b(?:set\s*timer|set\s*alarm|set\s*time|set\s*reminder|timer|alarm)\b/i.test(text) ||
    /\b(?:ingatkan|remind\s*me|remind|tolong\s*ingat)\b/i.test(text) ||
    /\b(?:nanti|kemudian|lepas\s*ni)\b.*\b(?:tag|mention|ingat)\b/i.test(text) ||
    // "dalam 10 minit tag saya" or "dalam 2 jam ingatkan saya"
    /\b(?:dalam|lagi|lepas|selepas)\s+\d+\s*(?:minit|min|jam|hour|saat|sec)\b/i.test(text) ||
    /\b(?:dalam|lagi|lepas|selepas)\s+(?:satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|setengah)\s*(?:minit|min|jam|hour|saat|sec)\b/i.test(text) ||
    // "tag saya dalam 10 minit"
    /\b(?:tag|mention)\s+(?:saya|aku|me|awak|dia|korang)\b/i.test(text) ||
    // "dalam 30 minit buat x" — time + intent
    /\b(?:dalam|lagi)\b/i.test(text) && /\b(?:sejam|minit|jam)\b/i.test(text) && /\b(?:buat|bagi|ingat|reminder|tag|siap|selesai)\b/i.test(text);

  if (!isExplicitTimer) return null;

  let totalMs = 0;
  let timeFormatted = '';

  const numMap: Record<string, number> = {
    satu: 1,
    dua: 2,
    tiga: 3,
    empat: 4,
    lima: 5,
    enam: 6,
    tujuh: 7,
    lapan: 8,
    sembilan: 9,
    sepuluh: 10,
    setengah: 0.5,
  };

  const wordMatch = text.match(
    /(satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|setengah)\s*(saat|sec|minit|min|jam|hour)/i
  );
  if (wordMatch) {
    const val = numMap[wordMatch[1].toLowerCase()] || 1;
    const unit = wordMatch[2].toLowerCase();
    if (unit.startsWith('saat') || unit.startsWith('sec')) {
      totalMs = Math.round(val * 1000);
      timeFormatted = `${val} saat`;
    } else if (unit.startsWith('min')) {
      totalMs = Math.round(val * 60 * 1000);
      timeFormatted = `${val} minit`;
    } else if (unit.startsWith('jam') || unit.startsWith('hour')) {
      totalMs = Math.round(val * 3600 * 1000);
      timeFormatted = `${val} jam`;
    }
  }

  if (totalMs === 0) {
    const digitMatch = text.match(/(\d+)\s*(saat|sec|minit|min|jam|hour)/i);
    if (digitMatch) {
      const val = parseInt(digitMatch[1], 10);
      const unit = digitMatch[2].toLowerCase();
      if (unit.startsWith('saat') || unit.startsWith('sec')) {
        totalMs = val * 1000;
        timeFormatted = `${val} saat`;
      } else if (unit.startsWith('min')) {
        totalMs = val * 60 * 1000;
        timeFormatted = `${val} minit`;
      } else if (unit.startsWith('jam') || unit.startsWith('hour')) {
        totalMs = val * 3600 * 1000;
        timeFormatted = `${val} jam`;
      }
    }
  }

  if (totalMs === 0) {
    const simpleMin = text.match(/(?:timer|alarm|ingatkan)\s+(\d+)\s*m/i);
    if (simpleMin) {
      const val = parseInt(simpleMin[1], 10);
      totalMs = val * 60 * 1000;
      timeFormatted = `${val} minit`;
    }
  }

  if (totalMs === 0) return null;

  const remindAtMs = Date.now() + totalMs;

  let actionText = rawPrompt
    .replace(
      /^(?:set\s*timer|set\s*time|timer|set\s*alarm|alarm|set\s*reminder|ingatkan|remind\s*me|remind|tolong\s*ingat)\s*/i,
      ''
    )
    .replace(
      /(?:dalam|lagi|lepas|selepas)\s+(?:\d+|satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|setengah)\s*(?:saat|sec|minit|min|jam|hour)\s*(?:nanti|lepas\s*tu|ingatkan|tag|mention)?/gi,
      ''
    )
    .replace(
      /(?:pada|pukul|masa|time)?\s*(?:\d+|satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|setengah)\s*(?:saat|sec|minit|min|jam|hour)\s*/gi,
      ''
    )
    .replace(/(?:tag|mention|jamun)\s+(?:saya|aku|me|awak|dia|korang)\s*/gi, '')
    .replace(/(?:saya|aku)\s+(?:tag|mention|jamun)\s*/gi, '')
    .replace(/<@!?\d+>/g, '')
    .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
    .trim();

  if (
    !actionText ||
    actionText.length === 0 ||
    /^(?:aku|saya|kawan|bro|nanti|tu|sekarang|kejap|biasa)$/i.test(actionText)
  ) {
    actionText = `Masa ${timeFormatted} dah tamat!`;
  }

  return {
    remindAtMs,
    reminderText: actionText,
    timeFormatted,
  };
}

// ── Target Channel Resolver (For Polls, Announcements, etc.) ─
async function resolveTargetChannel(
  client: Client,
  message: any,
  channelHint?: string | null
): Promise<any> {
  // 1. Direct channel mention in message.mentions.channels
  if (message.mentions && message.mentions.channels && message.mentions.channels.size > 0) {
    const firstMentioned = message.mentions.channels.first();
    if (firstMentioned && firstMentioned.isTextBased()) {
      return firstMentioned;
    }
  }

  // 2. If channelHint is provided (e.g. ID or channel name like "lepak-base")
  if (channelHint) {
    const cleanHint = channelHint.replace(/^[#<@!&>]+|[>]+$/g, '').toLowerCase().trim();

    // Check if channelHint is a snowflake ID
    if (/^\d{17,20}$/.test(cleanHint)) {
      try {
        const fetched = await client.channels.fetch(cleanHint);
        if (fetched && (fetched as any).isTextBased?.()) return fetched;
      } catch (e) {
        // channel fetch fallback
      }
    }

    // Check by name in guild
    if (message.guild) {
      const byName = message.guild.channels.cache.find(
        (c: any) =>
          c.isTextBased &&
          c.isTextBased() &&
          (c.name.toLowerCase() === cleanHint ||
            c.name.toLowerCase().replace(/[-_ ]/g, '') === cleanHint.replace(/[-_ ]/g, ''))
      );
      if (byName) return byName;

      // Try fetching guild channels if not in cache
      try {
        const guildChannels = await message.guild.channels.fetch();
        const found = guildChannels.find(
          (c: any) =>
            c &&
            c.isTextBased &&
            c.isTextBased() &&
            (c.name.toLowerCase() === cleanHint ||
              c.name.toLowerCase().replace(/[-_ ]/g, '') === cleanHint.replace(/[-_ ]/g, ''))
        );
        if (found) return found;
      } catch (e) {
        // guild fetch fallback
      }
    }
  }

  // Fallback to current message channel
  return message.channel;
}

// ── Natural Poll Parser (Detect poll creation from mention) ───
function parseNaturalPoll(rawPrompt: string): {
  question: string;
  options: string[];
  duration: number;
  multiselect: boolean;
  channelHint: string | null;
} | null {
  const text = rawPrompt.trim();
  const lower = text.toLowerCase();

  // Check if this is a poll request
  const isPollRequest =
    /\b(?:buat|create|make|bikin|tolong\s*buat|boleh\s*buat|buatkan|start|mulakan|open|post|set)\s+(?:a\s+|an\s+)?(?:poll|undian|voting|undi|vote)\b/i.test(lower) ||
    /\b(?:poll|undian|vote|voting)\s+(?:kat|di|in|untuk|dekat|dalam|to)\b/i.test(lower);

  if (!isPollRequest) return null;

  let remaining = text;

  // 1. Extract channel hint (e.g. <#123456> or in #lepak-base or kat #general)
  let channelHint: string | null = null;
  const channelMentionMatch = remaining.match(/<#(\d+)>/);
  if (channelMentionMatch) {
    channelHint = channelMentionMatch[1];
    remaining = remaining.replace(channelMentionMatch[0], ' ');
  }

  const channelTextMatch = remaining.match(/\b(?:in|kat|di|dalam|dekat|pada|to)\s+#([a-zA-Z0-9_\-]+)\b/i);
  if (channelTextMatch && !channelHint) {
    channelHint = channelTextMatch[1];
    remaining = remaining.replace(channelTextMatch[0], ' ');
  }

  // 2. Parse duration if mentioned (e.g. 12 hours / 2 days)
  let duration = 24; // default 24 hours
  const durationMatch = remaining.match(
    /\b(?:duration|masa|lama|tempoh|for)\s*[:=]?\s*(\d+)\s*(?:jam|hour|h|hours|hari|days|day)\b/i
  );
  if (durationMatch) {
    let val = parseInt(durationMatch[1], 10);
    if (/hari|days|day/i.test(durationMatch[0])) val = val * 24;
    duration = Math.min(Math.max(val, 1), 168);
    remaining = remaining.replace(durationMatch[0], ' ');
  }

  // 3. Parse multiselect
  let multiselect = false;
  if (/\b(?:multi(?:ple)?|boleh\s*pilih\s*banyak|multi.?select|pelbagai\s*pilihan)\b/i.test(remaining)) {
    multiselect = true;
    remaining = remaining.replace(/\b(?:multi(?:ple)?|boleh\s*pilih\s*banyak|multi.?select|pelbagai\s*pilihan)\b/gi, ' ');
  }

  // 4. Remove leading trigger phrases:
  // e.g. "can u make a poll in", "tolong buat poll kat", "please make a poll", etc.
  remaining = remaining
    .replace(
      /^(?:can\s+(?:you|u)\s+(?:please\s+)?|could\s+(?:you|u)\s+(?:please\s+)?|please\s+|tolong\s+(?:lah\s+)?|boleh\s+(?:tak|ke)\s+(?:kau|awak|u)?\s*|bisa\s+(?:tak|gak)?\s*|cuba\s+)?(?:buat(?:kan)?|create|make|bikin|start|mulakan|open|post|set)\s+(?:a\s+|an\s+)?(?:poll|undian|voting|undi|vote)\s*(?:in|kat|di|dalam|dekat|to)?\s*/i,
      ''
    )
    .replace(/^(?:poll|undian)\s+(?:kat|di|in|untuk|dekat|dalam|to)?\s*/i, '')
    .replace(/^[,\s:.-]+/, '')
    .trim();

  // If there's a channel name leftover at the front (e.g. "in lepak-base , ask them...")
  const leadChannel = remaining.match(/^(?:in|kat|di|dalam|dekat|pada|to)\s+#?([a-zA-Z0-9_\-]+)\s*[,\s:.-]*/i);
  if (leadChannel) {
    if (!channelHint) channelHint = leadChannel[1];
    remaining = remaining.replace(leadChannel[0], '').trim();
  }

  // 5. Remove question prefixes: "ask them ...", "tanya diorang ...", etc.
  remaining = remaining
    .replace(
      /^(?:and\s+|n\s+|then\s+)?(?:ask\s+them\s+(?:if|whether|who|what|where|when|which|how)?|ask\s+(?:who|what|where|when|which|how|if|whether)|tanya(?:kan)?\s+(?:diorang|mereka|member|korang|semua)?\s*(?:siapa|apa|bila|mana|macam mana|ada|kalau)?|suruh\s+(?:diorang|korang)\s+vote|tanya\s+)/i,
      (match) => {
        const questionWord = match.match(/\b(who|what|where|when|which|how|siapa|apa|bila|mana|macam mana|ada)\b/i);
        return questionWord ? questionWord[1] + ' ' : '';
      }
    )
    .replace(/^[,\s:.-]+/, '')
    .trim();

  let question = '';
  let options: string[] = [];

  // 6. Check for explicit "yes or no" option pattern:
  // e.g. "n make it yes or no option", "pilihan yes / no", "make options yes or no"
  const yesNoMatch = remaining.match(
    /[,.]?\s*(?:and\s+|n\s+)?(?:make\s+it|set\s+it\s+as|with|buat|letak|jadikan|pilihan)\s+(?:it\s+)?(?:yes\s*(?:or|dan|&|\/|,)\s*no|ya\s*(?:atau|dan|&|\/|,)\s*tidak|yes\s*no|ya\s*tidak)\s*(?:option|options|pilihan)?/i
  );
  if (yesNoMatch) {
    question = remaining.replace(yesNoMatch[0], '').trim();
    options = ['Yes', 'No'];
  }

  // 7. Check for explicit "options:" / "pilihan:" syntax
  if (options.length === 0) {
    const optLabelMatch = remaining.match(/[,;]?\s*(?:options|pilihan|choices|answers)\s*[:=]\s*(.+)$/i);
    if (optLabelMatch) {
      question = remaining.replace(optLabelMatch[0], '').trim();
      options = optLabelMatch[1].split(/[,|]/).map(s => s.trim()).filter(s => s.length > 0);
    }
  }

  // 8. Pipe separation: "Soalan | Option 1 | Option 2"
  if (options.length === 0) {
    const pipeSplit = remaining.split('|').map((s) => s.trim()).filter((s) => s.length > 0);
    if (pipeSplit.length >= 3) {
      question = pipeSplit[0];
      options = pipeSplit.slice(1);
    }
  }

  // 9. Comma separation: "Soalan, Option 1, Option 2, Option 3"
  if (options.length === 0) {
    const parts = remaining.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.length >= 3) {
      question = parts[0];
      options = parts.slice(1);
    } else if (parts.length === 2) {
      question = parts[0];
      options = parts.slice(1);
      if (options[0] && options[0].length > 55) {
        question = remaining;
        options = [];
      }
    }
  }

  // 10. Fallback options to Yes / No if none provided
  if (options.length < 2) {
    if (!question) question = remaining;
    options = ['Yes', 'No'];
  }

  // Clean up question
  question = question
    .replace(/^[,\s:.-]+|[,\s:.-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!question || question.length < 2) {
    return null;
  }

  // Capitalize first letter
  question = question.charAt(0).toUpperCase() + question.slice(1);

  // Add question mark if appropriate
  if (!/[?!.]$/.test(question)) {
    question += '?';
  }

  // Limit to max 10 options
  options = options.slice(0, 10);
  if (options.length < 2) {
    options = ['Yes', 'No'];
  }

  return {
    question,
    options,
    duration,
    multiselect,
    channelHint,
  };
}

// ── Database Table Setup ──────────────────────────────────────
async function ensureBotTables(): Promise<void> {
  await initHiraraDatabase();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT '1',
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      mode TEXT DEFAULT 'Ranked',
      duration INTEGER DEFAULT 0,
      result TEXT NOT NULL,
      notes TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS game_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      slot INTEGER DEFAULT 1,
      player_name TEXT NOT NULL,
      hero_name TEXT NOT NULL
    )
  `);
}

// ── Hero Info Card Builder ────────────────────────────────────
function buildHeroEmbed(heroName: string): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> } | null {
  const hero = ALL_HEROES.find(
    (h) => h.name.toLowerCase() === heroName.toLowerCase() || h.id.toLowerCase() === heroName.toLowerCase()
  );

  if (!hero) return null;

  const heroCounterData = HEROES.find(
    (h) => h.name.toLowerCase() === hero.name.toLowerCase()
  );

  const strongAgainst = heroCounterData?.strongAgainst?.length
    ? heroCounterData.strongAgainst.join(', ')
    : 'Squishy hero tanpa escape & hero berjarak dekat';

  const weakAgainst = heroCounterData?.weakAgainst?.length
    ? heroCounterData.weakAgainst.join(', ')
    : 'Hero hard CC, suppression & burst suppression';

  const difficultyStars = '⭐'.repeat(hero.difficulty || 1) + '☆'.repeat(3 - (hero.difficulty || 1));

  const roleColors: Record<string, number> = {
    Tank: 0x2ecc71,
    Fighter: 0xe67e22,
    Assassin: 0x9b59b6,
    Mage: 0x3498db,
    Marksman: 0xf1c40f,
    Support: 0x1abc9c,
  };
  const color = roleColors[hero.role[0]] || 0x5865f2;

  const embed = new EmbedBuilder()
    .setTitle(`🛡️ ${hero.name} — Profile & Counter Guide`)
    .setDescription(hero.description || 'Penerangan hero tiada dalam pangkalan data.')
    .setColor(color)
    .setThumbnail(hero.image)
    .addFields(
      {
        name: '🎭 Role & Specialty',
        value: `**Role:** ${hero.role.join(', ')}\n**Specialty:** ${hero.specialty || 'General'}\n**Difficulty:** ${difficultyStars}`,
        inline: true,
      },
      {
        name: '⚡ Playstyle & Timing',
        value: `**Style:** ${hero.tags?.join(', ') || 'Standard'}\n**Power Spike:** ${hero.timing?.join(', ') || 'Mid Game'}\n**CC Level:** ${hero.cc || 'Normal'}`,
        inline: true,
      },
      {
        name: '🗡️ Strong Against (Counter Pick)',
        value: `✅ ${strongAgainst}`,
        inline: false,
      },
      {
        name: '⚠️ Weak Against (Berhati-hati)',
        value: `❌ ${weakAgainst}`,
        inline: false,
      }
    )
    .setFooter({
      text: 'Sentinel MLBB Pro Bot • Gunakan butang di bawah untuk aksi pantas',
      iconURL: 'https://sentinel-mlbb.vercel.app/favicon.ico',
    });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`hero_counters_${hero.name}`)
      .setLabel('🛡️ Counter Guide')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`hero_synergy_${hero.name}`)
      .setLabel('⚔️ Best Combo/Synergy')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('🌐 Web Simulator')
      .setStyle(ButtonStyle.Link)
      .setURL('https://sentinel-mlbb.vercel.app/dashboard/draft')
  );

  return { embed, row };
}

// ── Match Stats Calculator ────────────────────────────────────
async function getPlayerStatsEmbed(playerName: string): Promise<EmbedBuilder> {
  await ensureBotTables();

  const gamesRes = await db.execute({
    sql: `SELECT g.id, g.result, g.duration, g.date, g.notes, p.hero_name, p.player_name
          FROM games g
          JOIN game_players p ON g.id = p.game_id
          WHERE lower(p.player_name) = lower(?) OR lower(p.player_name) = 'me'
          ORDER BY g.id DESC LIMIT 30`,
    args: [playerName],
  }).catch(() => ({ rows: [] }));

  const rows = gamesRes.rows;
  if (!rows || rows.length === 0) {
    return new EmbedBuilder()
      .setTitle(`📊 Rekod Perlawanan — ${playerName}`)
      .setDescription(
        `Belum ada rekod game untuk **${playerName}**.\n\nGunakan arahan \`/sentinel addgame\` untuk merekodkan perlawanan pertama anda!`
      )
      .setColor(0x3498db);
  }

  const total = rows.length;
  const wins = rows.filter((r: any) => (r.result || '').toLowerCase() === 'win').length;
  const losses = total - wins;
  const winrate = ((wins / total) * 100).toFixed(1);

  // Calculate top heroes
  const heroCount: Record<string, { total: number; wins: number }> = {};
  for (const r of rows) {
    const h = r.hero_name || 'Unknown';
    if (!heroCount[h]) heroCount[h] = { total: 0, wins: 0 };
    heroCount[h].total += 1;
    if ((r.result || '').toLowerCase() === 'win') heroCount[h].wins += 1;
  }

  const topHeroes = Object.entries(heroCount)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([name, data]) => {
      const wr = ((data.wins / data.total) * 100).toFixed(0);
      return `• **${name}**: ${data.total} Game (${wr}% WR)`;
    })
    .join('\n');

  // Recent 5 match logs
  const recentLogs = rows
    .slice(0, 5)
    .map((r: any, idx: number) => {
      const isWin = (r.result || '').toLowerCase() === 'win';
      const icon = isWin ? '🏆' : '💀';
      const notes = r.notes ? ` - *${r.notes}*` : '';
      return `${idx + 1}. ${icon} **${r.result}** | **${r.hero_name}** (${r.duration || 0}m)${notes}`;
    })
    .join('\n');

  const winrateColor = parseFloat(winrate) >= 60 ? 0x2ecc71 : parseFloat(winrate) >= 50 ? 0xf1c40f : 0xe74c3c;

  return new EmbedBuilder()
    .setTitle(`📊 Statistik Perlawanan MLBB — ${playerName}`)
    .setColor(winrateColor)
    .addFields(
      {
        name: '📈 Ringkasan Prestasi',
        value: `**Total Games:** ${total}\n**Winrate:** ${winrate}%\n**Kemenangan:** ${wins}W / ${losses}L`,
        inline: true,
      },
      {
        name: '🔥 Top Heroes Dimainkan',
        value: topHeroes || 'Tiada hero dicatat',
        inline: true,
      },
      {
        name: '🕒 5 Perlawanan Terkini',
        value: recentLogs || 'Tiada rekod',
        inline: false,
      }
    )
    .setFooter({ text: 'Sentinel MLBB Match Engine • Rekod dikemaskini dalam pangkalan data' });
}

// ── Model Selection Component ─────────────────────────────────
async function buildModelSelectorEmbed(): Promise<{ embed: EmbedBuilder; row: ActionRowBuilder<StringSelectMenuBuilder> }> {
  const currentModel = await llm.getActiveModel();

  const embed = new EmbedBuilder()
    .setTitle('⚙️ Konfigurasi Model Pintar AI Sentinel')
    .setDescription(
      `Model aktif terkini: \`${currentModel}\`\n\nPilih model di bawah untuk menukar enjin kepintaran bot secara serta-merta!`
    )
    .setColor(0x9b59b6)
    .addFields(
      {
        name: '🚀 Auto (Gemma 4 31B)',
        value: 'Paling pantas, natural dalam Bahasa Melayu harian & casual chat.',
        inline: false,
      },
      {
        name: '🧠 DeepSeek V3 (Reasoning)',
        value: 'Pakar analisa komprehensif, drafting mendalam & kod GitHub.',
        inline: false,
      },
      {
        name: '⚡ Qwen 2.5 72B (Versatile)',
        value: 'Model ultra-pintar dengan pemahaman strategi dan taktik kompleks.',
        inline: false,
      }
    );

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_model')
    .setPlaceholder('Pilih model AI baharu...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Auto (Gemma 4 31B Flash)')
        .setDescription('Model lalai pantas dan mesra')
        .setValue('auto')
        .setDefault(currentModel === 'auto' || currentModel.includes('gemma')),
      new StringSelectMenuOptionBuilder()
        .setLabel('DeepSeek V3')
        .setDescription('Pakar reasoning dan analisa mendalam')
        .setValue('deepseek-v3')
        .setDefault(currentModel === 'deepseek-v3'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Qwen 2.5 72B')
        .setDescription('Model versatile tahap enterprise')
        .setValue('qwen-2.5-72b')
        .setDefault(currentModel === 'qwen-2.5-72b'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Nemotron 3.5 Lightning')
        .setDescription('Model respons pantas')
        .setValue('nvidia/nemotron-3.5-lightning:free')
        .setDefault(currentModel.includes('nemotron'))
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
  return { embed, row };
}

// ── Main Bot Initialization ───────────────────────────────────
async function startHiraraBot() {
  await ensureBotTables();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildScheduledEvents,
      GatewayIntentBits.GuildMessagePolls,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.User,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`🛡️ Sentinel MLBB Specialized Discord Bot Online as ${c.user.tag}`);
    startReminderScheduler(client);
  });

  // ============================================================
  // 1. AUTOCOMPLETE HANDLER (Instant live hero search in Discord)
  // ============================================================
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isAutocomplete()) return;

    try {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name' || focusedOption.name === 'hero') {
        const query = (focusedOption.value || '').toLowerCase().trim();

        const filtered = ALL_HEROES.filter((h) =>
          h.name.toLowerCase().includes(query) || h.id.toLowerCase().includes(query)
        ).slice(0, 25);

        await interaction.respond(
          filtered.map((h) => ({
            name: `${h.name} (${h.role.join('/')}) — ${h.specialty}`,
            value: h.name,
          }))
        );
      }
    } catch (err) {
      console.warn('[Autocomplete Error]:', err);
    }
  });

  // ============================================================
  // 2. SLASH COMMAND HANDLER (/sentinel ...)
  // ============================================================
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    if (commandName !== 'sentinel') return;

    const subCommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const rawUsername = interaction.user.username || 'member';

    try {
      // ── Subcommand: /sentinel hero <name> ───────────────────
      if (subCommand === 'hero') {
        const heroName = interaction.options.getString('name', true);
        const card = buildHeroEmbed(heroName);

        if (!card) {
          await interaction.reply({
            content: `❌ Hero **${heroName}** tidak dijumpai dalam pangkalan data. Sila gunakan cadangan auto-lengkap semasa menaip.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.reply({
          embeds: [card.embed],
          components: [card.row],
        });
        return;
      }

      // ── Subcommand: /sentinel draft ────────────────────────
      if (subCommand === 'draft') {
        const embed = new EmbedBuilder()
          .setTitle('🎯 Sentinel MLBB — Interactive Draft Helper')
          .setDescription(
            'Kuasai fasa drafting dengan analisa counter-pick, ban priority meta, dan sinergi komposisi squad.'
          )
          .setColor(0x5865f2)
          .addFields(
            {
              name: '📌 Peraturan Utama Draft S2026',
              value:
                '1. **Ambil Core Role Dahulu:** Selamatkan Jungler / Gold Laner Tier-S.\n2. **Keseimbangan CC:** Pastikan squad mempunyai sekurang-kurangnya 2 hero hard CC.\n3. **Frontline Tebal:** EXP Lane atau Roam wajib mampu menahan damage (frontline).',
              inline: false,
            },
            {
              name: '🔥 Ban Priority Terkini',
              value: '• **Tigreal / Khufra** (Anti-dive/Heavy CC)\n• **Fanny / Joy** (High Mobility Jungle)\n• **Zhuxin / Vexana** (Zone Control Mages)',
              inline: false,
            }
          )
          .setFooter({ text: 'Klik butang di bawah untuk membuka alat drafting web rasmi' });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('draft_bans')
            .setLabel('🔥 Meta Ban Priority')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('draft_roles')
            .setLabel('🛡️ Komposisi Squad Ideal')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel('🚀 Buka Web Draft Simulator')
            .setStyle(ButtonStyle.Link)
            .setURL('https://sentinel-mlbb.vercel.app/dashboard/draft')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      // ── Subcommand: /sentinel meta ─────────────────────────
      if (subCommand === 'meta') {
        const embed = new EmbedBuilder()
          .setTitle('🔥 Meta Tier List & Ban Priority S2026')
          .setDescription('Senarai hero paling berkesan mengikut role dalam Ranked Meta semasa.')
          .setColor(0xf1c40f)
          .addFields(
            {
              name: '🛡️ Roam / Tank (SS-Tier)',
              value: '• **Tigreal** • **Khufra** • **Minotaur** • **Mathilda**',
              inline: true,
            },
            {
              name: '🗡️ Jungler (SS-Tier)',
              value: '• **Fanny** • **Nolan** • **Suyou** • **Ling** • **Baxia**',
              inline: true,
            },
            {
              name: '🔮 Mid Lane / Mage (SS-Tier)',
              value: '• **Zhuxin** • **Vexana** • **Novaria** • **Pharsa**',
              inline: true,
            },
            {
              name: '🏹 Gold Lane / MM (SS-Tier)',
              value: '• **Beatrix** • **Claude** • **Brody** • **Moskov**',
              inline: true,
            },
            {
              name: '⚔️ EXP Lane / Fighter (SS-Tier)',
              value: '• **Terizla** • **Yu Zhong** • **Cici** • **Ruby**',
              inline: true,
            },
            {
              name: '🚫 Top Ban Priority',
              value: '1. **Zhuxin** | 2. **Fanny** | 3. **Tigreal** | 4. **Nolan**',
              inline: true,
            }
          )
          .setFooter({ text: 'Sentinel Meta Engine • Dikemaskini berdasarkan statistik MLBB API' });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // ── Subcommand: /sentinel stats [user] ──────────────────
      if (subCommand === 'stats') {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const targetName = targetUser.username || 'member';

        await interaction.deferReply();
        const statsEmbed = await getPlayerStatsEmbed(targetName);
        await interaction.editReply({ embeds: [statsEmbed] });
        return;
      }

      // ── Subcommand: /sentinel addgame ───────────────────────
      if (subCommand === 'addgame') {
        const result = interaction.options.getString('result', true);
        const hero = interaction.options.getString('hero', true);
        const duration = interaction.options.getInteger('duration', true);
        const notes = interaction.options.getString('notes') || '';

        await ensureBotTables();

        const gameRes = await db.execute({
          sql: `INSERT INTO games (user_id, date, mode, duration, result, notes)
                VALUES (?, datetime('now'), 'Ranked', ?, ?, ?) RETURNING id`,
          args: [userId, duration, result, notes],
        });

        const gameId = gameRes.rows[0]?.id || 1;

        await db.execute({
          sql: `INSERT INTO game_players (game_id, slot, player_name, hero_name) VALUES (?, 1, ?, ?)`,
          args: [gameId, rawUsername, hero],
        });

        const isWin = result.toLowerCase() === 'win';
        const embed = new EmbedBuilder()
          .setTitle(isWin ? '🏆 Perlawanan Berjaya Direkod (MENANG)!' : '💀 Perlawanan Berjaya Direkod (KALAH)')
          .setColor(isWin ? 0x2ecc71 : 0xe74c3c)
          .addFields(
            { name: 'Pemain', value: rawUsername, inline: true },
            { name: 'Hero', value: hero, inline: true },
            { name: 'Masa', value: `${duration} Minit`, inline: true },
            { name: 'Keputusan', value: isWin ? '✅ **WIN**' : '❌ **LOSS**', inline: true },
            { name: 'Nota', value: notes || 'Tiada nota', inline: true }
          )
          .setFooter({ text: 'Data disimpan dalam SQLite • Lihat `/sentinel stats` untuk statistik terkumpul' });

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // ── Subcommand: /sentinel model ─────────────────────────
      if (subCommand === 'model') {
        const selectModel = interaction.options.getString('select');

        if (selectModel) {
          await llm.setActiveModel(selectModel);
          await interaction.reply({
            content: `✅ **Model Berjaya Dikemaskini!**\nSentinel AI kini menggunakan enjin: \`${selectModel}\``,
            ephemeral: true,
          });
          return;
        }

        const selector = await buildModelSelectorEmbed();
        await interaction.reply({
          embeds: [selector.embed],
          components: [selector.row],
          ephemeral: true,
        });
        return;
      }

      // ── Subcommand: /sentinel ask & /sentinel askmlbb ───────
      if (subCommand === 'ask' || subCommand === 'askmlbb') {
        const query = interaction.options.getString('question', true);
        await interaction.deferReply();

        const isCoachMode = subCommand === 'askmlbb';
        const { displayName, memoriesList, recentHistory, pronoun } = await getUserHiraraContext(
          userId,
          rawUsername
        );

        const systemPrompt = isCoachMode
          ? `Kau ni Sentinel AI Coach, kawan yang pandai pasal Mobile Legends. Panggil ${displayName} "member" atau "kawan". Guna aku/kau santai. Bantu pasal draft, counter-pick, item build, strategi. Jawab Melayu santai, pendek, dan tepat. Jangan keluarkan monolog atau draf. Jawab terus.`
          : `Kau ni Sentinel, kawan AI serba boleh. Bisa tolong borak apa-apa topik — bukan MLBB je. Panggil ${displayName}. Guna ${pronoun === 'awak_saya' ? 'awak/saya' : 'aku/kau'} bersahaja. Jawab soalan dengan cerdas, pendek, mesra. Kalau user tanya English, balas English. Kalau Melayu, balas Melayu. Jangan tulis "Response:" atau monolog dalaman. Jawab terus apa yang ditanya.`;

        const messages = [
          { role: 'system', content: systemPrompt },
          ...recentHistory.slice(-6),
          { role: 'user', content: query },
        ];

        const activeModel = await llm.getActiveModel();
        const chatCompletion = await llm.chat.completions.create({
          messages,
          model: activeModel,
          temperature: 0.7,
          max_tokens: 1200,
        });

        const rawResponse =
          chatCompletion.choices[0]?.message?.content ||
          chatCompletion.choices[0]?.message?.reasoning_content ||
          chatCompletion.choices[0]?.message?.reasoning ||
          'Maaf, saya menghadapi sedikit gangguan sambungan tadi.';

        const cleaned = cleanModelOutput(rawResponse) || 'Maaf, saya menghadapi sedikit gangguan sambungan tadi.';

        await recordChatMessage(userId, 'user', query, interaction.guildId || undefined, interaction.channelId);
        await recordChatMessage(userId, 'assistant', cleaned, interaction.guildId || undefined, interaction.channelId);

        await interaction.editReply({ content: cleaned });
        return;
      }

      // ── Subcommand: /sentinel poll ─────────────────────────
      if (subCommand === 'poll') {
        const question = interaction.options.getString('question', true);
        const optionsRaw = interaction.options.getString('options', true);
        const targetChannelOption = interaction.options.getChannel('channel');
        const duration = interaction.options.getInteger('duration') || 24;
        const multichoice = interaction.options.getBoolean('multichoice') ?? false;

        // Parse comma-separated options
        const pollOptions = optionsRaw
          .split(',')
          .map((o) => o.trim())
          .filter((o) => o.length > 0)
          .slice(0, 10); // Discord max 10 answers

        if (pollOptions.length < 2) {
          await interaction.reply({
            content: '❌ **Kena ada sekurang-kurangnya 2 pilihan!** Pisahkan dengan koma.\nContoh: `/sentinel poll question:Nak main malam ni? options:Yes, No, Maybe`',
            ephemeral: true,
          });
          return;
        }

        // Check for options exceeding 55 chars (Discord limit)
        const tooLong = pollOptions.find((o) => o.length > 55);
        if (tooLong) {
          await interaction.reply({
            content: `❌ **Pilihan terlalu panjang!** Setiap pilihan maksimum 55 aksara.\nPilihan yang bermasalah: "${tooLong.substring(0, 55)}..."`,
            ephemeral: true,
          });
          return;
        }

        // Default emojis for poll options
        const defaultEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const pollData: PollData = {
          question: { text: question.length > 300 ? question.substring(0, 300) : question },
          answers: pollOptions.map((opt, idx) => ({
            text: opt,
            emoji: defaultEmojis[idx] || undefined,
          })),
          duration: Math.min(Math.max(duration, 1), 168),
          allowMultiselect: multichoice,
          layoutType: PollLayoutType.Default,
        };

        const targetChannel = (targetChannelOption as any) || interaction.channel;
        if (targetChannel && targetChannel.id !== interaction.channelId && targetChannel.send) {
          await targetChannel.send({
            content: `📊 **Poll dibuat oleh ${rawUsername}:**`,
            poll: pollData,
          });
          await interaction.reply({
            content: `✅ **Beres!** Poll dah berjaya dihantar ke <#${targetChannel.id}>! 📊`,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            poll: pollData,
          });
        }
        return;
      }

      // ── Subcommand: /sentinel launch ────────────────────────
      if (subCommand === 'launch') {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel('🚀 Buka Web Dashboard')
            .setStyle(ButtonStyle.Link)
            .setURL('https://sentinel-mlbb.vercel.app/dashboard'),
          new ButtonBuilder()
            .setLabel('🎯 Draft Simulator')
            .setStyle(ButtonStyle.Link)
            .setURL('https://sentinel-mlbb.vercel.app/dashboard/draft')
        );

        await interaction.reply({
          content: '🎮 **Sentinel MLBB Dashboard & Interactive Activity:**',
          components: [row],
        });
        return;
      }

      // ── Subcommand: /sentinel help ──────────────────────────
      if (subCommand === 'help') {
        const embed = new EmbedBuilder()
          .setTitle('📖 Panduan Arahan Sentinel MLBB')
          .setDescription('Berikut adalah senarai lengkap alat dan arahan Discord yang boleh anda gunakan:')
          .setColor(0x5865f2)
          .addFields(
            {
              name: '🔍 Maklumat & Drafting Hero',
              value:
                '`/sentinel hero <name>` — Info statistik, counter-pick & skill hero (Auto-complete)\n`/sentinel draft` — Pembantu drafting interaktif & ban priority\n`/sentinel meta` — Senarai tier-list hero & ban priority musim ini',
              inline: false,
            },
            {
              name: '📊 Rekod & Statistik Perlawanan',
              value:
                '`/sentinel addgame` — Rekod perlawanan baru (Win/Loss, hero, duration)\n`/sentinel stats [user]` — Lihat winrate, top heroes & rekod perlawanan',
              inline: false,
            },
            {
              name: '📊 Poll / Undian',
              value:
                '`/sentinel poll` — Buat poll rasmi Discord (soalan, pilihan, duration)\n`@Sentinel buat poll ...` — Buat poll secara natural dengan mention bot',
              inline: false,
            },
            {
              name: '🤖 AI Assistant & Coach',
              value:
                '`/sentinel ask <question>` — Tanya apa-apa soalan, boleh borak serba aktif\n`/sentinel askmlbb <question>` — Nasihat taktikal MLBB daripada AI Coach\n`/sentinel model` — Tukar model AI (DeepSeek, Qwen, Gemma)\n`@Sentinel MLBB <mesej>` — Borak semulajadi, set pemasa/reminder, tanya apa-apa',
              inline: false,
            }
          )
          .setFooter({ text: 'Sentinel MLBB Specialized Discord System' });

        await interaction.reply({ embeds: [embed] });
        return;
      }
    } catch (err: any) {
      console.error('[Slash Command Error]:', err);
      const errMsg = `❌ Ralat semasa memproses arahan: ${err.message || 'Sila cuba sebentar lagi.'}`;
      if (interaction.deferred) {
        await interaction.editReply({ content: errMsg });
      } else if (!interaction.replied) {
        await interaction.reply({ content: errMsg, ephemeral: true });
      }
    }
  });

  // ============================================================
  // 3. INTERACTIVE BUTTON & SELECT MENU HANDLER
  // ============================================================
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
      const btn = interaction as ButtonInteraction;
      const customId = btn.customId;

      try {
        if (customId.startsWith('hero_counters_')) {
          const heroName = customId.replace('hero_counters_', '');
          const heroCounterData = HEROES.find(
            (h) => h.name.toLowerCase() === heroName.toLowerCase()
          );

          const strong = heroCounterData?.strongAgainst?.join(', ') || 'Hero squishy tanpa escape';
          const weak = heroCounterData?.weakAgainst?.join(', ') || 'Hard CC & Suppression';

          await btn.reply({
            content: `🛡️ **Counter Analysis untuk ${heroName}:**\n• **Paling berkesan digunakan menentang:** ${strong}\n• **Hero yang mampu meng-counter ${heroName}:** ${weak}`,
            ephemeral: true,
          });
          return;
        }

        if (customId.startsWith('hero_synergy_')) {
          const heroName = customId.replace('hero_synergy_', '');
          await btn.reply({
            content: `⚔️ **Cadangan Kombo & Sinergi untuk ${heroName}:**\nPadankan dengan hero ber-CC tinggi (cth: Tigreal, Khufra, Atlas) untuk setup ultimate atau follow-up burst yang maksimum.`,
            ephemeral: true,
          });
          return;
        }

        if (customId === 'draft_bans') {
          await btn.reply({
            content: `🔥 **Top 5 Meta Bans Semasa:**\n1. **Zhuxin** (Crowd control zon keterlaluan)\n2. **Fanny** (High skill ceiling, mobiliti tanpa henti)\n3. **Tigreal** (Game changer ultimate)\n4. **Nolan** (Fast burst & quick jungle clear)\n5. **Suyou** (High burst multi-form assassin)`,
            ephemeral: true,
          });
          return;
        }

        if (customId === 'draft_roles') {
          await btn.reply({
            content: `🛡️ **Komposisi Squad Seimbang (5-Man):**\n• **1 Roam/Tank:** Inisiator utama & CC tebal\n• **1 EXP Laner:** Semi-tank / sustain frontline\n• **1 Mid Mage:** High-ground damage & wave clear\n• **1 Gold MM:** Late-game damage dealer\n• **1 Jungler:** Retri objective & backline assassin`,
            ephemeral: true,
          });
          return;
        }
      } catch (e: any) {
        console.warn('[Button Handler Error]:', e);
      }
    }

    if (interaction.isStringSelectMenu()) {
      const menu = interaction as StringSelectMenuInteraction;
      if (menu.customId === 'select_model') {
        const selectedModel = menu.values[0];
        await llm.setActiveModel(selectedModel);
        await menu.reply({
          content: `✅ **Berjaya Ditukar!** Model AI aktif kini: \`${selectedModel}\``,
          ephemeral: true,
        });
      }
    }
  });

  // ============================================================
  // 4. NATURAL CONVERSATION & MENTION HANDLER
  // ============================================================
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const isDM = !message.guild;
    const isMentioned = client.user && message.mentions.has(client.user);

    // In servers, require bot mention. In DMs (personal chat), reply to every message!
    if (!isDM && !isMentioned) return;

    // Remove the bot's own mention and convert other user/bot mentions to readable text (@Username)
    const botId = client.user?.id;
    let prompt = message.content
      .replace(new RegExp(`<@!?${botId}>`, 'gi'), '')
      .trim();

    if (message.mentions && message.mentions.users) {
      message.mentions.users.forEach((user: any) => {
        if (user.id !== botId) {
          prompt = prompt.replace(new RegExp(`<@!?${user.id}>`, 'g'), `@${user.username || user.tag}`);
        }
      });
    }

    const userId = message.author.id;
    const channelId = message.channel.id;
    const rawUsername = message.author.username || 'kawan';

    // Fast empty greeting
    if (!prompt) {
      const greetingQuotes = [
        `Hai ${rawUsername}! Baby Hirara kat sini. Ada apa-apa nak sembang atau nak saya bantu? ✨`,
        `Yo! Hirara kat sini. Nak borak pasal apa hari ni? 🌸`,
        `Hai! Baby Hirara sedia. Ada benda nak tanya atau nak sembang santai? 😊`,
      ];
      const randomGreeting = greetingQuotes[Math.floor(Math.random() * greetingQuotes.length)];
      await message.reply({ content: randomGreeting, allowedMentions: { repliedUser: true, parse: [] } });
      return;
    }

    try {
      await message.channel.sendTyping();
    } catch (e) {
      // ignore typing indicator errors
    }

    try {
      const lower = prompt.toLowerCase();

      // Fetch User Memory, Profile & Access Permissions
      const { displayName, memoriesList, recentHistory, chatCount, pronoun } =
        await getUserHiraraContext(userId, rawUsername);

      const defaultUser = getDefaultGitHubUsername();
      const { authorized: isGitHubAuthorized, isOwner } = await isUserAuthorizedForGitHub(
        userId,
        rawUsername
      );

      // Access Management Commands (Owner Only)
      if (
        /(?:benarkan|bagi|grant|add)\s+(?:akses|access|kebenaran)?\s*(?:github)?/i.test(lower) &&
        message.mentions.users.size > 0
      ) {
        if (!isOwner) {
          await message.reply({
            content: `🔒 **Akses Ditolak:** Hanya pemilik bot (${defaultUser}) sahaja yang boleh memberi kebenaran akses GitHub kepada orang lain.`,
            allowedMentions: { repliedUser: true, parse: [] },
          });
          return;
        }

        const targetUsers = Array.from(message.mentions.users.values()).filter(
          (u) => u.id !== client.user?.id
        );

        for (const target of targetUsers) {
          await grantGitHubAccess(target.id, target.username, rawUsername);
        }

        const names = targetUsers.map((u) => u.username).join(', ');
        await message.reply({
          content: `✅ **Beres!** ${names} kini telah diberikan kebenaran untuk mengakses dan bertanyakan tentang projek GitHub **${defaultUser}**! ✨`,
          allowedMentions: { repliedUser: true, parse: [] },
        });
        return;
      }

      // Explicit Command: Create Poll via Mention
      const parsedPoll = parseNaturalPoll(prompt);
      if (parsedPoll) {
        try {
          const targetChannel = await resolveTargetChannel(client, message, parsedPoll.channelHint);

          if (!targetChannel || !targetChannel.send) {
            await message.reply({
              content: `❌ Tidak dapat menjumpai channel sasaran atau saya tiada kebenaran menghantar mesej di situ.`,
              allowedMentions: { repliedUser: true, parse: [] },
            });
            return;
          }

          const pollData: PollData = {
            question: { text: parsedPoll.question.length > 300 ? parsedPoll.question.substring(0, 300) : parsedPoll.question },
            answers: parsedPoll.options.map((opt, idx) => {
              const defaultEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
              return {
                text: opt.length > 55 ? opt.substring(0, 55) : opt,
                emoji: defaultEmojis[idx] || undefined,
              };
            }),
            duration: parsedPoll.duration,
            allowMultiselect: parsedPoll.multiselect,
            layoutType: PollLayoutType.Default,
          };

          await targetChannel.send({
            content: `📊 **Poll dibuat oleh ${displayName}:**`,
            poll: pollData,
          });

          if (targetChannel.id !== message.channel.id) {
            await message.reply({
              content: `✅ **Beres, ${displayName}!** Poll dah berjaya dihantar ke <#${targetChannel.id}>! 📊`,
              allowedMentions: { repliedUser: true, parse: [] },
            });
          }
          return;
        } catch (pollErr: any) {
          console.error('[Poll Create Error]:', pollErr);
          await message.reply({
            content: `❌ Maaf, ada masalah buat poll tu: ${pollErr.message || 'Sila pastikan bot mempunyai kebenaran View Channel, Send Messages, & Create Polls.'}`,
            allowedMentions: { repliedUser: true, parse: [] },
          });
          return;
        }
      }

      // Explicit Command: Set Timer / Alarm
      const parsedTimer = parseSmartReminder(prompt);
      if (parsedTimer) {
        await createReminder(userId, channelId, parsedTimer.remindAtMs, parsedTimer.reminderText);
        const tagWord = pronoun === 'awak_saya' ? 'awak' : 'kau';
        await message.reply({
          content: `⏰ **Beres, ${displayName}!** Saya dah setkan pemasa/peringatan untuk **${parsedTimer.timeFormatted}**!\n> 📌 **${parsedTimer.reminderText}**\n\nNanti cukup masa saya terus tag ${tagWord} kat sini! ✨`,
          allowedMentions: { repliedUser: true, parse: [] },
        });
        return;
      }

      // Explicit Command: Check Reminders List
      if (
        /^(?:check reminder|senarai reminder|ada reminder|tengok alarm|list reminder)$/i.test(
          lower.trim()
        )
      ) {
        const pending = await getUserPendingReminders(userId);
        if (pending.length === 0) {
          const userPronoun = pronoun === 'awak_saya' ? 'awak' : 'kau';
          await message.reply({
            content: `📋 **${displayName}**, ${userPronoun} tak ada sebarang peringatan/alarm yang aktif sekarang.`,
            allowedMentions: { repliedUser: true, parse: [] },
          });
          return;
        }

        let listText = `⏰ **Senarai peringatan aktif ${pronoun === 'awak_saya' ? 'awak' : 'kau'}, ${displayName}:**\n\n`;
        pending.forEach((r, idx) => {
          const dateStr = new Date(r.remind_at_ms).toLocaleTimeString('ms-MY', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          listText += `${idx + 1}. \`${dateStr}\` — **${r.reminder_text}**\n`;
        });
        await safeDiscordReply(message, listText);
        return;
      }

      // Explicit Command: List GitHub Repositories
      const isExplicitListRequest =
        /^(?:list|listkan|senarai|senaraikan|tunjuk|tunjukkan)\s+(?:semua\s+)?(?:repo|repos|repository|repositories|projek github)/i.test(
          lower.trim()
        ) ||
        /^(?:senarai|list|tunjuk)\s+(?:projek|repo)$/i.test(lower.trim());

      if (isExplicitListRequest) {
        if (!isGitHubAuthorized) {
          await message.reply({
            content: `🔒 **Akses Terhad:** Maaf, senarai repository GitHub **${defaultUser}** ini terhad kepada pemilik dan ahli yang dibenarkan sahaja. Sila minta ${defaultUser} untuk berikan kebenaran!`,
            allowedMentions: { repliedUser: true, parse: [] },
          });
          return;
        }

        const repos = await listUserRepositories(defaultUser);
        if (repos.length === 0) {
          await message.reply({
            content: `Saya belum dapat tarik sebarang repository dari GitHub **${defaultUser}** lagi.`,
            allowedMentions: { repliedUser: true, parse: [] },
          });
          return;
        }

        let repoMsg = `🐙 **Senarai Repository GitHub (${defaultUser} - ${repos.length} Repositori):**\n\n`;
        repos.forEach((r, idx) => {
          const stars = r.stars > 0 ? ` ⭐${r.stars}` : '';
          const lang = r.language ? ` • \`${r.language}\`` : '';
          const desc = r.description ? `\n   > *${r.description}*` : '';
          repoMsg += `${idx + 1}. **[${r.name}](${r.html_url})**${lang}${stars}${desc}\n`;
        });

        await safeDiscordReply(message, repoMsg);
        return;
      }

      // Dynamic AI Conversation
      const isGitHubQuery =
        /(?:github|repo|repos|repository|projek|proyek|coding|project|commit|branch|pr|code|script|api|source|fail|file)/i.test(
          lower
        );
      const realGitHubContext =
        isGitHubAuthorized && isGitHubQuery ? await getGitHubReposContext(defaultUser) : '';

      const memoriesContext =
        memoriesList.length > 0
          ? `Benda yang kau tau pasal ${displayName}:\n${memoriesList.join('\n')}`
          : `(Belum tau detail pasal ${displayName}. Kenali dia secara natural masa borak.)`;

      const pronounRule =
        pronoun === 'awak_saya' ||
        /pakai awak saya|guna awak saya|panggil awak saya|awak saya/i.test(lower)
          ? `Guna 'awak' untuk ${displayName} dan 'saya' untuk diri sendiri.`
          : `Boleh guna 'aku' untuk diri sendiri dan 'kau'/'korang' untuk ${displayName}. Santai je.`;

      const githubAccessInstruction = isGitHubAuthorized
        ? `GitHub: ${displayName} ada akses ke repo ${defaultUser}. Kalau dia tanya pasal coding/project, boleh bantu.`
        : `GitHub: ${displayName} tak ada akses ke repo private ${defaultUser}. Kalau dia tanya pasal repo private, cakap tak boleh dengan sopan.`;

      const chatModeContext = isDM
        ? `SITUASI: Sembang 1-on-1 secara peribadi (Direct Message/DM personal). Berbual mesra, akrab dan santai berdua.`
        : `SITUASI: Sembang dalam server/group Discord bersama ${displayName}.`;

      const systemPrompt = `Kau ni Baby Hirara (Sentinel AI), kawan AI yang serba boleh dan pintar kat Discord.
${chatModeContext}

MACAM NAK CAKAP:
- Bahasa: Melayu santai macam orang Malaysia sembang harian. Relaks, mesra, jangan kaku atau formal.
- ${pronounRule}
- ${githubAccessInstruction}

${realGitHubContext}

${memoriesContext}
Jumlah sembang dengan ${displayName}: ${chatCount} kali.

PENTING — OUTPUT RULES:
- Balas TERUS dengan jawapan final. Jangan tulis "Response:", "Here's my thinking", atau apa-apa monolog/draf.
- Jangan buat analisis dalam English. Jangan ulang peraturan.
- Jawalan je apa yang user tanya, pendek padat macam sembang kawan.
- Kalau user mesej dalam English, balas dalam English. Kalau Melayu, balas Melayu.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: prompt },
      ];

      const activeModel = await llm.getActiveModel();
      const chatCompletion = await llm.chat.completions.create({
        messages,
        model: activeModel,
        temperature: 0.7,
        max_tokens: 1500,
      });

      const rawResponse =
        chatCompletion.choices[0]?.message?.content ||
        chatCompletion.choices[0]?.message?.reasoning_content ||
        chatCompletion.choices[0]?.message?.reasoning ||
        'Alamak, sekejap ya talian saya macam ada sedikit lag tadi.';

      const cleanedResponse = cleanModelOutput(rawResponse) || 'Hai! Ada apa yang boleh saya bantu?';

      await recordChatMessage(userId, 'user', prompt, message.guild?.id, channelId);
      await recordChatMessage(userId, 'assistant', cleanedResponse, message.guild?.id, channelId);

      await safeDiscordReply(message, cleanedResponse);

      extractAndLearnMemories(userId, displayName, prompt, cleanedResponse).catch((err) =>
        console.warn('[Memory Background Task] Notice:', err)
      );
    } catch (err: any) {
      console.error('[Bot Message Handler Error]:', err);
      await message.reply({
        content: `*Ralat Sentinel: ${err.message || 'Ada sedikit masalah teknikal, cuba lagi jap lagi!'}*`,
        allowedMentions: { repliedUser: true, parse: [] },
      });
    }
  });

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('Missing DISCORD_BOT_TOKEN in .env.local');
    process.exit(1);
  }

  client.login(token);
}

// ── Background Reminder Scheduler (Checks every 5 seconds) ────
function startReminderScheduler(client: Client) {
  setInterval(async () => {
    try {
      const dueReminders = await getDueReminders();

      for (const item of dueReminders) {
        try {
          const channel = (await client.channels.fetch(item.channel_id)) as any;
          if (channel && channel.send) {
            await channel.send({
              content: `🔔 <@${item.user_id}> **Peringatan daripada Sentinel!**\n> 📌 **${item.reminder_text}**\n*Masa dah sampai! ✨*`,
              allowedMentions: { users: [item.user_id] },
            });
          }
        } catch (err) {
          console.error('[Sentinel Scheduler] Send reminder error:', err);
        }

        if (item.id) {
          await markReminderDone(item.id);
        }
      }
    } catch (e) {
      // Ignore background interval errors
    }
  }, 5000);
}

startHiraraBot().catch(console.error);
