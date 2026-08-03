import { Client, GatewayIntentBits, Events } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

// Dynamic imports to prevent top-level execution errors
async function startBot() {
  const { createChatCompletion } = await import('../src/lib/groq');
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

      const historyRes = await db.execute({
        sql: "SELECT role, content FROM discord_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 6",
        args: [userId],
      });

      const pastMessages = historyRes.rows.reverse().map((r) => ({
        role: r.role as 'user' | 'assistant',
        content: r.content as string,
      }));

      const userName = message.author.username || 'member';
      const systemPrompt = `You are "Sentinel", a close squad member and dedicated personal assistant in this Discord server.
Your Persona:
- Talk like a loyal, friendly, and witty squad member / personal assistant ("geng", "bro", "member").
- Be supportive, highly intelligent, attentive, and ready to assist ${userName} with anything (casual chat, server tasks, advice, general knowledge, or games).
- Blend casual Bahasa Melayu / English naturally depending on how ${userName} speaks to you.
- Keep responses concise (under 2000 chars), formatted neatly with markdown.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...pastMessages,
        { role: 'user', content: prompt },
      ];

      const activeModel = (process.env.LLM_MODEL || 'auto').trim();
      const chatCompletion = await createChatCompletion({
        messages,
        model: activeModel,
        temperature: 0.7,
        max_tokens: 1000,
      });

      const finalResponse =
        chatCompletion.choices[0]?.message?.content ||
        chatCompletion.choices[0]?.message?.reasoning_content ||
        'I could not generate a response.';

      // Save history asynchronously
      db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'user', prompt] }).catch(console.error);
      db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'assistant', finalResponse] }).catch(console.error);

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
