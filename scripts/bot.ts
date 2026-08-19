import {
  Client,
  GatewayIntentBits,
  Events,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventEntityType,
} from 'discord.js';
import dotenv from 'dotenv';
import {
  getUserHiraraContext,
  recordChatMessage,
  extractAndLearnMemories,
  createReminder,
  getDueReminders,
  markReminderDone,
  getUserPendingReminders,
  saveUserMemory,
  initHiraraDatabase,
} from '../src/lib/memory';
import { llm } from '../src/lib/groq';
import { db } from '../src/lib/db';

dotenv.config({ path: '.env.local' });

// ============================================================
// HIRARA — AI Personal Companion & Long-Term Memory Assistant
// ============================================================

async function startHiraraBot() {
  await initHiraraDatabase();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildScheduledEvents,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`🌸 Hirara AI Companion Online as ${c.user.tag}`);
    startReminderScheduler(client);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const isMentioned = client.user && message.mentions.has(client.user);
    if (!isMentioned) return;

    const prompt = message.content.replace(/<@!?\d+>/g, '').trim();
    const userId = message.author.id;
    const channelId = message.channel.id;
    const rawUsername = message.author.username || 'kawan';

    // Fast empty greeting
    if (!prompt) {
      const greetingQuotes = [
        `Hai! Aku **Hirara**. Ada apa-apa nak sembang, tanya soalan, atau nak aku ingatkan apa-apa tak?`,
        `Yo! Hirara kat sini. Ada apa boleh aku tolong korang harini?`,
        `Weh! Ya aku Hirara. Nak borak pasal apa harini?`,
      ];
      const randomGreeting = greetingQuotes[Math.floor(Math.random() * greetingQuotes.length)];
      await message.reply(randomGreeting);
      return;
    }

    try {
      await message.channel.sendTyping();
    } catch (e) {
      // ignore typing indicator errors
    }

    try {
      const lower = prompt.toLowerCase();

      // ── 1. Fetch User Memory & Profile ───────────────────────
      const { displayName, memoriesList, recentHistory, chatCount } =
        await getUserHiraraContext(userId, rawUsername);

      // ── 2. Explicit Memory Command: "Kau ingat apa pasal aku?" ─
      if (
        /apa (?:yang )?kau ingat pasal aku|senarai memori aku|tengok memori|apa kau tahu pasal aku|ingat tak aku siapa/i.test(
          lower
        )
      ) {
        if (memoriesList.length === 0) {
          await message.reply(
            `Aku belum ada simpan banyak fakta pasal kau lagi, **${displayName}**! Tapi setiap kali kita borak, aku akan automatik ingat details & preference kau. Cerita la apa-apa pasal diri kau!`
          );
          return;
        }

        let memoryReport = `🧠 **Ini antara perkara & detail yang aku ingat pasal kau, ${displayName}:**\n\n`;
        memoriesList.forEach((m, idx) => {
          memoryReport += `• **${m}**\n`;
        });
        memoryReport += `\n*Otak aku makin kenal kau setiap kali kita borak! ✨*`;

        await message.reply(memoryReport);
        return;
      }

      // ── 3. Check Reminders / Alarms ──────────────────────────
      const isCheckReminder = /ada reminder|check reminder|senarai reminder|what are my reminder|tengok alarm|ada alarm/i.test(
        lower
      );
      if (isCheckReminder) {
        const pending = await getUserPendingReminders(userId);
        if (pending.length === 0) {
          await message.reply(
            `📋 **${displayName}**, kau tak ada sebarang peringatan/alarm yang aktif sekarang. Kalau nak aku ingatkan apa-apa, bagitahu je cth: *"Hirara, ingatkan aku 20 minit lagi..."*!`
          );
          return;
        }

        let listText = `⏰ **Senarai peringatan aktif kau, ${displayName}:**\n\n`;
        pending.forEach((r, idx) => {
          const dateStr = new Date(r.remind_at_ms).toLocaleTimeString('ms-MY', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          listText += `${idx + 1}. \`${dateStr}\` — **${r.reminder_text}**\n`;
        });
        await message.reply(listText);
        return;
      }

      // ── 4. Set Reminder / Alarm Intent ───────────────────────
      const isSetReminder =
        /^(?:ingatkan|remind me|set reminder|set alarm|tolong ingatkan)/i.test(prompt) ||
        /(?:ingatkan aku|ingatkan saya|remind me to|peringatkan aku)/i.test(prompt);

      if (isSetReminder) {
        const parsed = parseReminderIntent(prompt);
        if (parsed) {
          await createReminder(userId, channelId, parsed.remindAtMs, parsed.text);
          await message.reply(
            `⏰ **Beres, ${displayName}!** Aku dah setkan peringatan pada \`${parsed.timeFormatted}\` untuk:\n> **${parsed.text}**\n\nNanti sampai masa aku terus tag kau kat sini!`
          );
          return;
        }
      }

      // ── 5. AI Conversational Generation with Hirara Persona ──
      const memoriesContext =
        memoriesList.length > 0
          ? `DETAIL & FAKTA DIINGATI PASAL ${displayName.toUpperCase()}:\n${memoriesList.join('\n')}`
          : `(Belum ada detail khusus pasal ${displayName}, kenali diri dia secara semulajadi semasa borak)`;

      const systemPrompt = `Kau adalah "Hirara", seorang kawan borak orang Melayu dan pembantu peribadi yang pintar, mesra, santai, dan berjiwa member di Discord server ini.

IDENTITI & PERSONALITI HIRARA:
- Nama: Hirara (Orang Melayu, peramah, ada sense of humor, supportive, bijak, peka).
- Bahasa: Bahasa Melayu santai harian (casual & conversational). Guna 'aku' untuk diri sendiri dan 'kau' / 'korang' untuk kawan. Boleh selit slanga harian yang biasa (cth: "weh", "geng", "padu", "relax", "jap", "jom") tapi jangan melebih-lebih sampai cringe.
- Kamu BUKAN robot yang skema. Kamu bercakap macam kawan rapat yang ceria dan memahami.
- Fleksibel: Kamu boleh borak pasal apa sahaja — hal harian, kerja, belajar, coding, gaming, luahan perasaan, idea projek, atau sembang santai.
- Ingatan & Memori: Kamu mempunyai ingatan jangka panjang. Manfaatkan fakta yang kamu ingat tentang pengguna secara semulajadi bila relevan.

${memoriesContext}
JUMLAH PERBUALAN TERDAHULU DENGAN ${displayName.toUpperCase()}: ${chatCount} kali.

PANDUAN MENJAWAB:
1. Panggil pengguna dengan nama "${displayName}".
2. Jawab secara ringkas, padat, dan natural (bawah 1500 aksara).
3. Jika ditanya soalan teknikal atau serius, bantu dengan bijak dan tepat dalam nada santai yang mudah difahami.
4. Jangan berpura-pura tahu apa yang kau tak tahu, jujur macam kawan.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: prompt },
      ];

      const activeModel = await llm.getActiveModel();
      const chatCompletion = await llm.chat.completions.create({
        messages,
        model: activeModel,
        temperature: 0.75,
        max_tokens: 800,
      });

      const responseText =
        chatCompletion.choices[0]?.message?.content ||
        chatCompletion.choices[0]?.message?.reasoning_content ||
        chatCompletion.choices[0]?.message?.reasoning ||
        'Alamak weh, sekejap ya line aku macam lagging sikit tadi.';

      // Record chat turn in conversation log
      await recordChatMessage(userId, 'user', prompt, message.guild?.id, channelId);
      await recordChatMessage(userId, 'assistant', responseText, message.guild?.id, channelId);

      // Reply to Discord user
      await message.reply({ content: responseText });

      // Run background memory extraction (makes Hirara continuously smarter)
      extractAndLearnMemories(userId, displayName, prompt, responseText).catch((err) =>
        console.warn('[Hirara Memory Background Task] Notice:', err)
      );
    } catch (err: any) {
      console.error('[Hirara Bot Error]:', err);
      await message.reply({
        content: `*Ralat Hirara: ${err.message || 'Ada sedikit masalah teknikal, cuba lagi jap lagi!'}*`,
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

// ── Background Reminder Scheduler (Checks every 10 seconds) ───
function startReminderScheduler(client: Client) {
  setInterval(async () => {
    try {
      const dueReminders = await getDueReminders();

      for (const item of dueReminders) {
        try {
          const channel = (await client.channels.fetch(item.channel_id)) as any;
          if (channel && channel.send) {
            await channel.send(
              `🔔 <@${item.user_id}> **Peringatan daripada Hirara!**\n> 📌 **${item.reminder_text}**\n*Masa dah sampai geng!*`
            );
          }
        } catch (err) {
          console.error('[Hirara Scheduler] Send reminder error:', err);
        }

        if (item.id) {
          await markReminderDone(item.id);
        }
      }
    } catch (e) {
      // Ignore background interval errors
    }
  }, 10000);
}

// ── Helper: Parse Reminder Intent ─────────────────────────────
function parseReminderIntent(prompt: string): {
  remindAtMs: number;
  text: string;
  timeFormatted: string;
} | null {
  const lower = prompt.toLowerCase();

  // Pattern A: "dalam X minit/jam" / "in X minutes"
  const minMatch =
    lower.match(/(?:dalam|lagi|in)\s*(\d+)\s*(?:minit|minutes|min)/i) ||
    lower.match(/(\d+)\s*(?:minit|minutes|min)\s*(?:lagi|later)/i);

  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    const remindAtMs = Date.now() + mins * 60 * 1000;
    const targetDate = new Date(remindAtMs);
    const cleanText = prompt
      .replace(/^(?:hirara|weh hirara|eh hirara)[,\s]*/gi, '')
      .replace(/(?:ingatkan aku|ingatkan saya|remind me to|set reminder|set alarm)/gi, '')
      .replace(/(?:dalam|lagi|in)\s*\d+\s*(?:minit|minutes|min)/gi, '')
      .replace(/\d+\s*(?:minit|minutes|min)\s*(?:lagi|later)/gi, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
      .trim() || 'Peringatan anda';

    return {
      remindAtMs,
      text: cleanText,
      timeFormatted: `dalam ${mins} minit lagi (${targetDate.toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })})`,
    };
  }

  // Pattern B: Specific time "pukul 10.30 pm" / "at 9.00 am"
  const timeMatch =
    lower.match(/(?:pukul|jam|at)\s*(\d{1,2})[\.:](\d{2})\s*(am|pm)?/i) ||
    lower.match(/(\d{1,2})[\.:](\d{2})\s*(am|pm)/i) ||
    lower.match(/(?:pukul|jam|at)\s*(\d{1,2})\s*(am|pm|pagi|malam|petang|tengahari)/i);

  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] && !isNaN(parseInt(timeMatch[2], 10)) ? parseInt(timeMatch[2], 10) : 0;
    const period = (timeMatch[3] || timeMatch[2] || '').toLowerCase();

    if ((period === 'pm' || period === 'malam' || period === 'petang') && hours < 12) hours += 12;
    if ((period === 'am' || period === 'pagi') && hours === 12) hours = 0;

    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
    if (targetDate.getTime() <= now.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1); // Next day if time already passed
    }

    const cleanText = prompt
      .replace(/^(?:hirara|weh hirara|eh hirara)[,\s]*/gi, '')
      .replace(/(?:ingatkan aku|ingatkan saya|remind me to|set reminder|set alarm)/gi, '')
      .replace(/(?:pukul|jam|at)\s*\d{1,2}[\.:]\d{2}\s*(?:am|pm)?/gi, '')
      .replace(/(?:pukul|jam|at)\s*\d{1,2}\s*(?:am|pm|pagi|malam|petang|tengahari)/gi, '')
      .replace(/<@!?\d+>/g, '')
      .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
      .trim() || 'Peringatan anda';

    return {
      remindAtMs: targetDate.getTime(),
      text: cleanText,
      timeFormatted: targetDate.toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    };
  }

  // Fallback: 10 minutes from now
  const remindAtMs = Date.now() + 10 * 60 * 1000;
  const cleanText = prompt
    .replace(/^(?:hirara|weh hirara|eh hirara)[,\s]*/gi, '')
    .replace(/(?:ingatkan aku|ingatkan saya|remind me to|set reminder|set alarm)/gi, '')
    .replace(/<@!?\d+>/g, '')
    .replace(/^[\s,:-]+|[\s,:-]+$/g, '')
    .trim() || 'Peringatan anda';

  return {
    remindAtMs,
    text: cleanText,
    timeFormatted: 'dalam 10 minit lagi',
  };
}

startHiraraBot().catch(console.error);
