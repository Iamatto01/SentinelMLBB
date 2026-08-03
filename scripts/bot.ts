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
  });

  client.on(Events.MessageCreate, async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if bot is mentioned (@Sentinel AI)
    const isMentioned = client.user && message.mentions.has(client.user);
    if (!isMentioned) return;

    // Remove @bot mention from prompt
    const prompt = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!prompt) {
      await message.reply("Hello! Ask me any question or mention me (@Sentinel AI) with your question.");
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

      const historyRes = await db.execute({
        sql: "SELECT role, content FROM discord_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 16",
        args: [userId],
      });

      const pastMessages = historyRes.rows.reverse().map((r) => ({
        role: r.role as 'user' | 'assistant',
        content: r.content as string,
      }));

      const userName = message.author.username || 'member';
      const displayName = savedNickname || userName;

      const systemPrompt = `You are "Sentinel", a close squad member and dedicated personal assistant to ${displayName} in this Discord server.

SAVED FACTS & PREFERENCES ABOUT THIS USER (${displayName}):
${factList.length > 0 ? factList.join('\n') : '- Primary Nickname: ' + displayName}

CRITICAL RULES:
- ALWAYS address the user as "${displayName}" (NEVER forget their nickname!).
- Respect user preferences (e.g. if preferred pronoun is 'kau', use 'kau' / 'aku'. If forbidden word is 'bro', NEVER use 'bro'!).
- Talk like a loyal, friendly, and witty squad member & personal assistant ("geng", "member", "kau", "aku").
- DO NOT pretend or hallucinate non-existent Discord commands (e.g., /createevent, /setreminder). If asked for features not supported yet, answer truthfully in casual BM.
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

startBot().catch(console.error);
