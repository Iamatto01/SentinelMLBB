import {
  Client,
  GatewayIntentBits,
  Events,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
} from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function startBot() {
  const { llm } = await import('../src/lib/groq');
  const { db } = await import('../src/lib/db');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildScheduledEvents,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`🚀 Sentinel MLBB 100% Mini PC P.A. Engine Online as ${c.user.tag}`);
    startPAScheduler(client, db);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const isMentioned = client.user && message.mentions.has(client.user);
    if (!isMentioned) return;

    const prompt = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!prompt) {
      await message.reply("👋 Yo! Aku Sentinel P.A. korang. Ada apa-apa nak aku ingat, set reminder, buat event, atau susun jadual?");
      return;
    }

    try {
      await message.channel.sendTyping();
    } catch (e) {
      // ignore typing error
    }

    try {
      const userId = message.author.id;
      const channelId = message.channel.id;
      const guild = message.guild;

      // ── Initialize SQLite Tables ───────────────────────────────
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
          user_id TEXT, memory_key TEXT, memory_value TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, memory_key)
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS user_reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT, channel_id TEXT, remind_at DATETIME,
          reminder_text TEXT, status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS squad_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT, channel_id TEXT, title TEXT,
          description TEXT, start_time DATETIME,
          discord_event_id TEXT, notified_15m INTEGER DEFAULT 0,
          notified_start INTEGER DEFAULT 0, created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS squad_schedules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          day_name TEXT, time_str TEXT, activity_name TEXT,
          notes TEXT, created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS squad_games (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_name TEXT UNIQUE,
          category TEXT DEFAULT 'General',
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed default squad games if empty
      const countRes = await db.execute("SELECT COUNT(*) as count FROM squad_games").catch(() => ({ rows: [{ count: 0 }] }));
      const totalCount = countRes.rows[0]?.count || 0;
      if (totalCount === 0) {
        const defaultGames = [
          'Mobile Legends: Bang Bang (MLBB)',
          'Valorant',
          'PUBG Mobile / PUBG',
          'Dota 2',
          'Call of Duty: Modern Warfare',
          'CS:GO',
          'Fortnite',
          'League of Legends',
          'Overwatch',
          'Rainbow Six Siege'
        ];
        for (const g of defaultGames) {
          await db.execute({ sql: "INSERT OR IGNORE INTO squad_games (game_name, created_by) VALUES (?, 'System')", args: [g] }).catch(() => {});
        }
      }

      const lower = prompt.toLowerCase();

      // ── 1. User Preference & Memory Auto-Saver ───────────────
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

      // ── 2. GAME MANAGEMENT COMMANDS ────────────────────────────
      const isAddGame = /tambah game|add game|masukkan game/i.test(lower);
      if (isAddGame) {
        const gameMatch = prompt.replace(/tambah game|add game|masukkan game/gi, '').replace(/<@!?\d+>/g, '').trim();
        if (gameMatch) {
          await db.execute({
            sql: "INSERT INTO squad_games (game_name, created_by) VALUES (?, ?) ON CONFLICT(game_name) DO NOTHING",
            args: [gameMatch, displayName]
          });
          await message.reply({
            content: `🎮 **Game Berjaya Ditambah!**\nGame **"${gameMatch}"** kini disimpan secara kekal dalam database Sentinel AI oleh **${displayName}**!`
          });
          return;
        }
      }

      // ── 3. REAL DISCORD EVENT CREATION ─────────────────────────
      const isCreateEvent = /create event|buat event|tambah event|set event/i.test(lower);
      if (isCreateEvent) {
        const parsedEvent = parseEventDetails(prompt);
        if (guild && parsedEvent) {
          try {
            const scheduledEvent = await guild.scheduledEvents.create({
              name: parsedEvent.title,
              scheduledStartTime: parsedEvent.startTime,
              scheduledEndTime: new Date(parsedEvent.startTime.getTime() + 2 * 60 * 60 * 1000),
              privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
              entityType: GuildScheduledEventEntityType.External,
              entityMetadata: { location: 'Discord Server / Mobile Legends' },
              description: `Dianjurkan oleh ${displayName} (Disusun oleh Sentinel P.A.)`,
            });

            const startTimeSql = parsedEvent.startTime.toISOString().replace('T', ' ').substring(0, 19);

            await db.execute({
              sql: "INSERT INTO squad_events (guild_id, channel_id, title, description, start_time, discord_event_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
              args: [guild.id, channelId, parsedEvent.title, parsedEvent.description, startTimeSql, scheduledEvent.id, displayName]
            });

            await message.reply({
              content: `🎉 **Event Berjaya Dicipta, ${displayName}!**\n\n📌 **Nama Event:** ${parsedEvent.title}\n🕒 **Waktu:** \`${parsedEvent.timeFormatted}\`\n🔗 **Link Event Discord:** ${scheduledEvent.url}\n\n*Aku akan automatik ping korang 15 minit sebelum event bermula & bila event bermula!*`
            });
            return;
          } catch (eventErr: any) {
            console.error('Failed to create Discord Event:', eventErr);
            const startTimeSql = parsedEvent.startTime.toISOString().replace('T', ' ').substring(0, 19);
            await db.execute({
              sql: "INSERT INTO squad_events (guild_id, channel_id, title, description, start_time, discord_event_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
              args: [guild?.id || '', channelId, parsedEvent.title, parsedEvent.description, startTimeSql, '', displayName]
            });

            await message.reply({
              content: `📅 **Event P.A. Berjaya Disimpan, ${displayName}!**\n\n📌 **Nama Event:** ${parsedEvent.title}\n🕒 **Waktu:** \`${parsedEvent.timeFormatted}\`\n\n*Aku akan ingatkan korang 15 minit sebelum event bermula!*`
            });
            return;
          }
        }
      }

      // ── 4. SQUAD SCHEDULE MANAGEMENT ───────────────────────────
      const isScheduleAdd = /tambah jadual|add schedule|set jadual/i.test(lower);
      if (isScheduleAdd) {
        const schedMatch = prompt.match(/(?:tambah jadual|add schedule|set jadual)\s+(isnin|selasa|rabu|khamis|jumaat|sabtu|ahad|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2}[\.:]\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)?)\s+(.+)/i);
        if (schedMatch) {
          const day = schedMatch[1];
          const time = schedMatch[2];
          const activity = schedMatch[3];

          await db.execute({
            sql: "INSERT INTO squad_schedules (day_name, time_str, activity_name, created_by) VALUES (?, ?, ?, ?)",
            args: [day.toUpperCase(), time, activity, displayName]
          });

          await message.reply({
            content: `📅 **Jadual Squad Ditambah, ${displayName}!**\n\n🗓️ **Hari:** ${day.toUpperCase()}\n⏰ **Masa:** ${time}\n🎮 **Aktiviti:** ${activity}`
          });
          return;
        }
      }

      const isScheduleView = /tunjuk jadual|senarai jadual|view schedule|jadual squad|lihat jadual/i.test(lower);
      if (isScheduleView) {
        const schedRes = await db.execute("SELECT day_name, time_str, activity_name, created_by FROM squad_schedules ORDER BY id ASC");
        if (schedRes.rows.length === 0) {
          await message.reply({ content: `📅 **${displayName}**, belum ada jadual squad yang ditetapkan! Taip \`@Sentinel MLBB tambah jadual Isnin 9.00 pm Scrim MLBB\` untuk tambah.` });
          return;
        }

        let msgText = `🗓️ **JADUAL AKTIVITI SQUAD (${displayName}):**\n\n`;
        schedRes.rows.forEach((r: any, i: number) => {
          msgText += `${i + 1}. **[${r.day_name}]** \`${r.time_str}\` — **${r.activity_name}** *(Ditambah oleh: ${r.created_by})*\n`;
        });

        await message.reply({ content: msgText });
        return;
      }

      // ── 5. REMINDERS & ALARMS ──────────────────────────────────
      const isCheckReminder = /do u have any reminder|any reminder|check reminder|senarai reminder|what are my reminder|ada reminder/i.test(lower);
      if (isCheckReminder) {
        const activeR = await db.execute({
          sql: "SELECT remind_at, reminder_text FROM user_reminders WHERE user_id = ? AND status = 'pending' ORDER BY remind_at ASC",
          args: [userId]
        });
        if (activeR.rows.length === 0) {
          await message.reply({ content: `📋 **${displayName}**, kau tak ada sebarang reminder/alarm aktif sekarang!` });
          return;
        }
        let listText = `📋 **${displayName}**, ini senarai reminder/alarm kau yang tengah aktif:\n`;
        activeR.rows.forEach((r: any, idx: number) => {
          listText += `${idx + 1}. 🕒 \`${r.remind_at}\` — **${r.reminder_text}**\n`;
        });
        await message.reply({ content: listText });
        return;
      }

      const isSetReminder = /setreminder|ingatkan|remind me|peringatan|set reminder|peringatkan|set alarm|alarm/i.test(prompt);
      if (isSetReminder) {
        const parsed = parseReminderIntent(prompt);
        if (parsed) {
          await db.execute({
            sql: "INSERT INTO user_reminders (user_id, channel_id, remind_at, reminder_text, status) VALUES (?, ?, ?, ?, 'pending')",
            args: [userId, channelId, parsed.remindAtSql, parsed.text]
          });
          await message.reply({
            content: `⏰ **Noted, ${displayName}!** Aku dah setkan alarm/reminder pada \`${parsed.timeFormatted}\` untuk:\n> **${parsed.text}**\n\nNanti aku ping kau kat sini bila sampai masa!`
          });
          return;
        }
      }

      // ── 6. AI PERSONAL ASSISTANT CHAT WITH REAL DB GAMES ───────
      const gamesRes = await db.execute("SELECT game_name FROM squad_games ORDER BY id ASC").catch(() => ({ rows: [] }));
      const savedGamesList = gamesRes.rows.map((r: any) => `• ${r.game_name}`).join('\n');

      const historyRes = await db.execute({
        sql: "SELECT role, content FROM discord_chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 16",
        args: [userId],
      });

      const pastMessages = historyRes.rows.reverse().map((r) => ({
        role: r.role as 'user' | 'assistant',
        content: r.content as string,
      }));

      const systemPrompt = `You are "Sentinel", a dedicated 24/7 Personal Assistant and Squad Coordinator running 100% locally on the Mini PC for ${displayName} and their squad in this Discord server.

SAVED FACTS ABOUT THIS USER (${displayName}):
${factList.length > 0 ? factList.join('\n') : '- Primary Nickname: ' + displayName}

ACTUAL GAMES STORED IN SENTINEL AI DATABASE:
${savedGamesList || '• Mobile Legends: Bang Bang (MLBB)\n• Valorant\n• PUBG Mobile\n• Dota 2\n• Call of Duty: Modern Warfare\n• CS:GO\n• Fortnite\n• League of Legends\n• Overwatch\n• Rainbow Six Siege'}

CRITICAL RULES:
- ALWAYS reference the exact games in the database list above when asked about games played by the squad!
- NEVER hallucinate fake esports teams (like Evos, Blacklist, TNC, ONIC) or fake match results unless they are in the database!
- ALWAYS address the user as "${displayName}".
- Respect user preferences (e.g., if preferred pronoun is 'kau', use 'kau'/'aku'. Never use 'bro' if forbidden).
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
        'Aku tak dapat jawapan dari enjin P.A.';

      try {
        await db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'user', prompt] });
        await db.execute({ sql: "INSERT INTO discord_chat_history (user_id, role, content) VALUES (?, ?, ?)", args: [userId, 'assistant', finalResponse] });
      } catch (e) {
        console.warn('[DB] History insert warning:', e);
      }

      await message.reply({ content: finalResponse });
    } catch (err: any) {
      console.error('Error replying to P.A. request:', err);
      await message.reply({ content: `*Ralat P.A. Mini PC: ${err.message || err}*` });
    }
  });

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("Missing DISCORD_BOT_TOKEN");
    process.exit(1);
  }

  client.login(token);
}

// ── 24/7 BACKGROUND SCHEDULER (MINI PC) ──────────────────────────
function startPAScheduler(client: Client, db: any) {
  setInterval(async () => {
    try {
      // 1. Check Due User Reminders & Alarms
      const dueReminders = await db.execute({
        sql: "SELECT id, user_id, channel_id, reminder_text FROM user_reminders WHERE status = 'pending' AND datetime(remind_at) <= datetime('now', 'localtime')"
      });

      for (const r of dueReminders.rows) {
        try {
          const channel = await client.channels.fetch(r.channel_id) as any;
          if (channel && channel.send) {
            await channel.send(`🚨 <@${r.user_id}> **ALARM / P.A. REMINDER!**\n> **${r.reminder_text}**`);
          }
        } catch (err) {
          console.error('[Scheduler] Failed to send reminder:', err);
        }

        await db.execute({
          sql: "UPDATE user_reminders SET status = 'completed' WHERE id = ?",
          args: [r.id]
        }).catch(console.error);
      }

      // 2. Check Upcoming Guild Events (15m warning & start ping)
      const upcomingEvents = await db.execute({
        sql: "SELECT id, channel_id, title, start_time, notified_15m, notified_start, created_by FROM squad_events WHERE notified_start = 0"
      });

      const now = new Date().getTime();

      for (const ev of upcomingEvents.rows) {
        const eventTime = new Date(ev.start_time).getTime();
        const diffMins = (eventTime - now) / (1000 * 60);

        // 15-minute warning ping
        if (diffMins <= 15 && diffMins > 0 && ev.notified_15m === 0) {
          try {
            const channel = await client.channels.fetch(ev.channel_id) as any;
            if (channel && channel.send) {
              await channel.send(`📣 @everyone **P.A. EVENT WARNING!**\n> Event **${ev.title}** (dicipta oleh ${ev.created_by}) akan bermula dalam **15 MINIT lagi**! Sedia geng!`);
            }
          } catch (e) {
            console.error('Failed to send 15m event warning:', e);
          }
          await db.execute({ sql: "UPDATE squad_events SET notified_15m = 1 WHERE id = ?", args: [ev.id] });
        }

        // Event started ping
        if (diffMins <= 0 && ev.notified_start === 0) {
          try {
            const channel = await client.channels.fetch(ev.channel_id) as any;
            if (channel && channel.send) {
              await channel.send(`🚨 @everyone **EVENT BERMULA SEKARANG!**\n> Event **${ev.title}** dah bermula! Jom masuk!`);
            }
          } catch (e) {
            console.error('Failed to send event start ping:', e);
          }
          await db.execute({ sql: "UPDATE squad_events SET notified_start = 1 WHERE id = ?", args: [ev.id] });
        }
      }
    } catch (e) {
      // ignore tick errors
    }
  }, 10000); // Check every 10 seconds
}

// ── PARSERS FOR EVENTS & REMINDERS ────────────────────────────────
function parseEventDetails(prompt: string) {
  const lower = prompt.toLowerCase();

  let title = prompt
    .replace(/create event|buat event|tambah event|set event/gi, '')
    .replace(/\d{1,2}[\.:]\d{2}\s*(?:am|pm)?/gi, '')
    .replace(/\d{1,2}\s*(?:am|pm)/gi, '')
    .replace(/harini|today|besok|tomorrow|malam ni|pagi ni/gi, '')
    .replace(/<@!?\d+>/g, '')
    .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
    .trim();

  if (!title) title = 'Squad Activity / Match';

  const timeMatch = lower.match(/(\d{1,2})[\.:](\d{2})\s*(am|pm)?/i) || lower.match(/(\d{1,2})\s*(am|pm)/i);
  let hours = 20;
  let mins = 0;

  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    mins = timeMatch[2] && !isNaN(parseInt(timeMatch[2], 10)) ? parseInt(timeMatch[2], 10) : 0;
    const ampm = (timeMatch[3] || timeMatch[2] || '').toLowerCase();
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
  }

  const now = new Date();
  const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);

  if (lower.includes('besok') || lower.includes('tomorrow')) {
    startTime.setDate(startTime.getDate() + 1);
  } else if (startTime.getTime() <= now.getTime()) {
    startTime.setDate(startTime.getDate() + 1);
  }

  const timeFormatted = startTime.toLocaleString('ms-MY', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return {
    title,
    description: `Aktiviti Squad: ${title}`,
    startTime,
    timeFormatted,
  };
}

function parseReminderIntent(prompt: string) {
  const lower = prompt.toLowerCase();

  const minMatch = lower.match(/(?:in|lagi|dalam)\s*(\d+)\s*(?:minit|minutes|min)/i) || lower.match(/(\d+)\s*(?:minit|minutes|min)\s*(?:lagi|later)/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    const targetDate = new Date(Date.now() + mins * 60 * 1000);
    const text = prompt
      .replace(/\/setreminder/gi, '')
      .replace(/ingatkan|remind me|set reminder|peringatan|set alarm|alarm/gi, '')
      .replace(/(?:in|lagi|dalam)\s*\d+\s*(?:minit|minutes|min)/gi, '')
      .replace(/\d+\s*(?:minit|minutes|min)\s*(?:lagi|later)/gi, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
      .trim() || 'Peringatan / Alarm anda';

    const remindAtSql = targetDate.toISOString().replace('T', ' ').substring(0, 19);
    return { remindAtSql, text, timeFormatted: `dalam ${mins} minit lagi (${targetDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })})` };
  }

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
      .replace(/set alarm|alarm/gi, '')
      .replace(/\d{1,2}[\.:]\d{2}\s*(?:am|pm)?/gi, '')
      .replace(/\d{1,2}\s*(?:am|pm)/gi, '')
      .replace(/harini|today|besok|tomorrow/gi, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
      .trim();

    if (!text) text = 'Peringatan / Alarm anda';

    const remindAtSql = targetDate.toISOString().replace('T', ' ').substring(0, 19);
    const timeFormatted = targetDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    return { remindAtSql, text, timeFormatted };
  }

  const targetDate = new Date(Date.now() + 15 * 60 * 1000);
  const text = prompt.replace(/\/setreminder/gi, '').replace(/ingatkan|remind me|set reminder|alarm/gi, '').replace(/<@!?\d+>/g, '').trim() || 'Peringatan / Alarm anda';
  const remindAtSql = targetDate.toISOString().replace('T', ' ').substring(0, 19);
  return { remindAtSql, text, timeFormatted: 'dalam 15 minit lagi' };
}

startBot().catch(console.error);
