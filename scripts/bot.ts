import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

// Dynamic imports to prevent top-level execution errors
async function startBot() {
  const { llm } = await import('../src/lib/groq');
  const { db } = await import('../src/lib/db');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`🤖 Sentinel MLBB Gateway Bot is online as ${c.user.tag}`);
    startReminderScheduler(client, db);
  });

  client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if bot is mentioned (@Sentinel MLBB)
    const isMentioned = client.user && message.mentions.has(client.user);
    if (!isMentioned) return;

    // Remove @bot mention from prompt
    const prompt = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!prompt) {
      await message.reply("Hello! Ask me any question or mention me (@Sentinel MLBB) with your question.");
      return;
    }

    // Trigger typing indicator
    try {
      await message.channel.sendTyping();
    } catch (e) {
      // ignore typing indicator errors
    }

    try {
      const userId = message.author.id;
      const channelId = message.channel.id;

      await db.execute(`
        CREATE TABLE IF NOT EXISTS discord_chat_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT, role TEXT, content TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_memories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          memory_key TEXT,
          memory_value TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, memory_key)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT,
          channel_id TEXT,
          remind_at DATETIME,
          reminder_text TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const lower = prompt.toLowerCase();

      // Auto-extract nickname declarations (e.g. "remember my name, Kentang", "nama aku Kentang", "panggil aku Kentang")
      const nickMatch = prompt.match(/(?:remember my name(?: is|,|\s+)|nama (?:panggilan )?aku|panggil (?:aku|saya)|name is|my name is|panggilan aku)\s+([A-Za-z0-9_-]+)/i);
      if (nickMatch && nickMatch[1]) {
        const nick = nickMatch[1].trim();
        if (nick.length > 1 && !['siapa', 'siapakah', 'apa', 'apakah', 'siapa?', 'apa?'].includes(nick.toLowerCase())) {
          await db.execute({
            sql: "INSERT INTO user_memories (user_id, memory_key, memory_value) VALUES (?, 'nickname', ?) ON CONFLICT(user_id, memory_key) DO UPDATE SET memory_value = excluded.memory_value",
            args: [userId, nick]
          }).catch(console.error);
        }
      }

      if (lower.includes('jgn guna bro') || lower.includes('jangan panggil bro') || lower.includes('bukan bro') || lower.includes('jangan guna bro')) {
        await db.execute({
          sql: "INSERT INTO user_memories (user_id, memory_key, memory_value) VALUES (?, 'forbidden_words', 'bro, kamu') ON CONFLICT(user_id, memory_key) DO UPDATE SET memory_value = excluded.memory_value",
          args: [userId]
        }).catch(console.error);
      }

      if (lower.includes('tukar kamu ke kau') || lower.includes('pakai kau') || lower.includes('guna kau') || lower.includes('pakai bahasa melayu')) {
        await db.execute({
          sql: "INSERT INTO user_memories (user_id, memory_key, memory_value) VALUES (?, 'preferred_pronoun', 'kau') ON CONFLICT(user_id, memory_key) DO UPDATE SET memory_value = excluded.memory_value",
          args: [userId]
        }).catch(console.error);
      }

      // Fetch saved memories
      const memRes = await db.execute({
        sql: "SELECT memory_key, memory_value FROM user_memories WHERE user_id = ?",
        args: [userId]
      }).catch(() => ({ rows: [] }));

      let savedNickname = '';
      const factList: string[] = [];
      for (const r of memRes.rows) {
        if (r.memory_key === 'nickname') savedNickname = r.memory_value;
        factList.push(`- ${r.memory_key}: ${r.memory_value}`);
      }

      const userName = message.author.username || 'member';
      const displayName = savedNickname || userName;

      // ── Handle REAL Reminder Actions ────────────────────────────
      const isCheckReminder = /do u have any reminder|any reminder|check reminder|senarai reminder|what are my reminder|ada reminder/i.test(lower);
      if (isCheckReminder) {
        const activeR = await db.execute({
          sql: "SELECT remind_at, reminder_text FROM user_reminders WHERE user_id = ? AND status = 'pending' ORDER BY remind_at ASC",
          args: [userId]
        });
        if (activeR.rows.length === 0) {
          await message.reply({ content: `📋 **${displayName}**, kau tak ada sebarang reminder aktif sekarang!` });
          return;
        }
        let listText = `📋 **${displayName}**, ini senarai reminder kau yang tengah aktif:\n`;
        activeR.rows.forEach((r: any, idx: number) => {
          listText += `${idx + 1}. 🕒 \`${r.remind_at}\` — **${r.reminder_text}**\n`;
        });
        await message.reply({ content: listText });
        return;
      }

      const isSetReminder = /setreminder|ingatkan|remind me|peringatan|set reminder|peringatkan/i.test(prompt);
      if (isSetReminder) {
        const parsed = parseReminderIntent(prompt);
        if (parsed) {
          await db.execute({
            sql: "INSERT INTO user_reminders (user_id, channel_id, remind_at, reminder_text, status) VALUES (?, ?, ?, ?, 'pending')",
            args: [userId, channelId, parsed.remindAtSql, parsed.text]
          });
          await message.reply({
            content: `⏰ **Noted, ${displayName}!** Aku dah setkan reminder pada \`${parsed.timeFormatted}\` untuk:\n> **${parsed.text}**\n\nNanti aku ping kau kat sini bila sampai masa!`
          });
          return;
        }
      }

      // ── Standard AI Personal Assistant Chat ─────────────────────
      const historyRes = await db.execute({
        sql: "SELECT role, content FROM discord_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 16",
        args: [userId],
      });

      const pastMessages = historyRes.rows.reverse().map((r) => ({
        role: r.role as 'user' | 'assistant',
        content: r.content as string,
      }));

      const systemPrompt = `You are "Sentinel", a close squad member and dedicated personal assistant to ${displayName} in this Discord server.

SAVED FACTS & PREFERENCES ABOUT THIS USER (${displayName}):
${factList.length > 0 ? factList.join('\n') : '- Primary Nickname: ' + displayName}

REAL P.A. CAPABILITIES YOU HAVE:
- You have a REAL built-in reminder engine! If the user wants to set a reminder or check reminders, guide them naturally.
- You can remember user preferences (nickname, preferred pronouns, custom facts).

CRITICAL RULES:
- ALWAYS address the user as "${displayName}" (NEVER forget their nickname!).
- Respect user preferences (e.g. if preferred pronoun is 'kau', use 'kau' / 'aku'. If forbidden word is 'bro', NEVER use 'bro'!).
- Talk like a loyal, friendly, and witty squad member & personal assistant ("geng", "member", "kau", "aku").
- Keep responses concise (under 2000 chars), formatted neatly with markdown.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...pastMessages,
        { role: 'user', content: prompt },
      ];

      const activeModel = await llm.getActiveModel();
      const chatCompletion = await llm.chat.completions.create({
        messages,
        model: activeModel,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const finalResponse =
        chatCompletion.choices[0]?.message?.content ||
        chatCompletion.choices[0]?.message?.reasoning_content ||
        'I could not generate a response.';

      // Await history inserts
      try {
        await db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'user', prompt] });
        await db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'assistant', finalResponse] });
      } catch (e) {
        console.warn('[DB] History insert warning in bot.ts:', e);
      }

      await message.reply({ content: finalResponse });
    } catch (err: any) {
      console.error('Error replying to mention:', err);
      await message.reply({ content: `*I encountered an error replying to your mention: ${err.message || err}*` });
    }
  });

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("Missing DISCORD_BOT_TOKEN");
    process.exit(1);
  }

  client.login(token);
}

// ── Reminder Scheduler Function ──────────────────────────────
function startReminderScheduler(client: Client, db: any) {
  setInterval(async () => {
    try {
      // Find due reminders
      const due = await db.execute({
        sql: "SELECT id, user_id, channel_id, reminder_text FROM user_reminders WHERE status = 'pending' AND datetime(remind_at) <= datetime('now')"
      });

      for (const r of due.rows) {
        try {
          const channel = await client.channels.fetch(r.channel_id) as any;
          if (channel && channel.send) {
            await channel.send(`🔔 <@${r.user_id}> **P.A. Reminder!**\n> **${r.reminder_text}**`);
          }
        } catch (err) {
          console.error('[Reminder] Failed to send reminder to channel:', err);
        }

        await db.execute({
          sql: "UPDATE user_reminders SET status = 'completed' WHERE id = ?",
          args: [r.id]
        }).catch(console.error);
      }
    } catch (e) {
      // ignore check error
    }
  }, 10000); // Check every 10s
}

// ── Reminder Parser Helper ──────────────────────────────────
function parseReminderIntent(prompt: string) {
  const lower = prompt.toLowerCase();

  // Relative minutes (e.g., 10 minit lagi, in 5 minutes)
  const minMatch = lower.match(/(?:in|lagi|dalam)\s*(\d+)\s*(?:minit|minutes|min)/i) || lower.match(/(\d+)\s*(?:minit|minutes|min)\s*(?:lagi|later)/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    const targetDate = new Date(Date.now() + mins * 60 * 1000);
    const text = prompt
      .replace(/\/setreminder/gi, '')
      .replace(/ingatkan|remind me|set reminder|peringatan/gi, '')
      .replace(/(?:in|lagi|dalam)\s*\d+\s*(?:minit|minutes|min)/gi, '')
      .replace(/\d+\s*(?:minit|minutes|min)\s*(?:lagi|later)/gi, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
      .trim() || 'Peringatan anda';

    const remindAtSql = targetDate.toISOString().replace('T', ' ').substring(0, 19);
    return { remindAtSql, text, timeFormatted: `dalam ${mins} minit lagi (${targetDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })})` };
  }

  // Clock time (e.g. 12.00 pm, 12:00 pm, 8:30 am, 14:00)
  const timeMatch = lower.match(/(\d{1,2})[\.:](\d{2})\s*(am|pm)?/i) || lower.match(/(\d{1,2})\s*(am|pm)/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] && !isNaN(parseInt(timeMatch[2], 10)) ? parseInt(timeMatch[2], 10) : 0;
    const ampm = (timeMatch[3] || timeMatch[2] || '').toLowerCase();

    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;

    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    let text = prompt
      .replace(/\/setreminder/gi, '')
      .replace(/ingatkan (?:aku|saya)?/gi, '')
      .replace(/remind me/gi, '')
      .replace(/\d{1,2}[\.:]\d{2}\s*(?:am|pm)?/gi, '')
      .replace(/\d{1,2}\s*(?:am|pm)/gi, '')
      .replace(/harini|today|besok|tomorrow/gi, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
      .trim();

    if (!text) text = 'Peringatan anda';

    const remindAtSql = targetDate.toISOString().replace('T', ' ').substring(0, 19);
    const timeFormatted = targetDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    return { remindAtSql, text, timeFormatted };
  }

  // Fallback 15 mins
  const targetDate = new Date(Date.now() + 15 * 60 * 1000);
  const text = prompt.replace(/\/setreminder/gi, '').replace(/ingatkan|remind me|set reminder/gi, '').replace(/<@!?\d+>/g, '').trim() || 'Peringatan anda';
  const remindAtSql = targetDate.toISOString().replace('T', ' ').substring(0, 19);
  return { remindAtSql, text, timeFormatted: 'dalam 15 minit lagi' };
}

startBot().catch(console.error);
