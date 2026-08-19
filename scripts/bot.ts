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

// ── Clean reasoning/thinking artifacts from model output ──────
function cleanModelOutput(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Remove <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Remove thinking process prefixes if present
  const thinkingMarkers = [
    /\*\*Response:\*\*/i,
    /\*\*Final Response:\*\*/i,
    /\*\*Jawapan:\*\*/i,
    /\*\*Reply:\*\*/i,
    /---\n/i,
  ];

  for (const marker of thinkingMarkers) {
    const parts = cleaned.split(marker);
    if (parts.length > 1 && parts[parts.length - 1].trim().length > 0) {
      cleaned = parts[parts.length - 1].trim();
      break;
    }
  }

  // If still starts with "Here's a thinking process:"
  if (/^(?:Here's a thinking process|Thinking Process|Let's think about this|The user is asking)/i.test(cleaned)) {
    const paragraphs = cleaned.split(/\n\s*\n/);
    const nonReasoning = paragraphs.filter(
      (p) => !/^(?:[0-9]+\.|\* |- |Here's|Let's|The user|I should|My goal|First,)/i.test(p.trim())
    );
    if (nonReasoning.length > 0) {
      cleaned = nonReasoning.join('\n\n').trim();
    }
  }

  return cleaned || text;
}

// ── Safe Discord reply (Auto-splits messages exceeding 1900 chars) ──
async function safeDiscordReply(message: any, rawText: string): Promise<void> {
  const text = cleanModelOutput(rawText) || 'Hai! Ada apa yang boleh saya bantu?';

  if (text.length <= 1900) {
    await message.reply({ content: text });
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
    await message.reply({ content: chunks[0] });
    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i] && chunks[i].length > 0) {
        await message.channel.send({ content: chunks[i] });
      }
    }
  }
}

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
        `Hai! Saya **Hirara**. Ada apa-apa nak sembang, tanya soalan, atau nak saya ingatkan apa-apa tak?`,
        `Yo! Hirara kat sini. Ada apa boleh saya tolong korang harini?`,
        `Hai! Ya saya Hirara. Nak borak pasal apa harini?`,
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
      const { displayName, memoriesList, recentHistory, chatCount, pronoun } =
        await getUserHiraraContext(userId, rawUsername);

      // ── 2. Explicit Memory Command: "Kau ingat apa pasal aku?" ─
      if (
        /apa (?:yang )?(?:kau|awak) ingat pasal (?:aku|saya)|senarai memori|tengok memori|apa (?:kau|awak) tahu pasal (?:aku|saya)|ingat tak (?:aku|saya) siapa/i.test(
          lower
        )
      ) {
        if (memoriesList.length === 0) {
          const userPronoun = pronoun === 'awak_saya' ? 'awak' : 'kau';
          await message.reply(
            `Saya belum ada simpan banyak fakta pasal ${userPronoun} lagi, **${displayName}**! Tapi setiap kali kita borak, saya akan automatik ingat details & preference ${userPronoun}. Cerita la apa-apa pasal diri ${userPronoun}! ✨`
          );
          return;
        }

        let memoryReport = `🧠 **Ini antara perkara & detail yang saya ingat pasal ${pronoun === 'awak_saya' ? 'awak' : 'kau'}, ${displayName}:**\n\n`;
        memoriesList.forEach((m) => {
          memoryReport += `• **${m}**\n`;
        });
        memoryReport += `\n*Otak saya makin kenal ${pronoun === 'awak_saya' ? 'awak' : 'kau'} setiap kali kita borak! ✨*`;

        await safeDiscordReply(message, memoryReport);
        return;
      }

      // ── 3. Check Reminders / Alarms ──────────────────────────
      const isCheckReminder = /ada reminder|check reminder|senarai reminder|what are my reminder|tengok alarm|ada alarm/i.test(
        lower
      );
      if (isCheckReminder) {
        const pending = await getUserPendingReminders(userId);
        if (pending.length === 0) {
          const userPronoun = pronoun === 'awak_saya' ? 'awak' : 'kau';
          await message.reply(
            `📋 **${displayName}**, ${userPronoun} tak ada sebarang peringatan/alarm yang aktif sekarang. Kalau nak saya ingatkan apa-apa, bagitahu je cth: *"Hirara, ingatkan saya 20 minit lagi..."*!`
          );
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

      // ── 4. Set Reminder / Alarm Intent ───────────────────────
      const isSetReminder =
        /^(?:ingatkan|remind me|set reminder|set alarm|tolong ingatkan)/i.test(prompt) ||
        /(?:ingatkan aku|ingatkan saya|remind me to|peringatkan aku|peringatkan saya)/i.test(prompt);

      if (isSetReminder) {
        const parsed = parseReminderIntent(prompt);
        if (parsed) {
          await createReminder(userId, channelId, parsed.remindAtMs, parsed.text);
          const tagWord = pronoun === 'awak_saya' ? 'awak' : 'kau';
          await message.reply(
            `⏰ **Beres, ${displayName}!** Saya dah setkan peringatan pada \`${parsed.timeFormatted}\` untuk:\n> **${parsed.text}**\n\nNanti sampai masa saya terus tag ${tagWord} kat sini!`
          );
          return;
        }
      }

      // ── 5. AI Conversational Generation with Hirara Persona ──
      const memoriesContext =
        memoriesList.length > 0
          ? `DETAIL & FAKTA DIINGATI PASAL ${displayName.toUpperCase()}:\n${memoriesList.join('\n')}`
          : `(Belum ada detail khusus pasal ${displayName}, kenali diri pengguna secara semulajadi semasa borak)`;

      const pronounRule =
        pronoun === 'awak_saya' || /pakai awak saya|guna awak saya|panggil awak saya|awak saya/i.test(lower)
          ? `GANTI NAMA: Gunakan panggilan 'Awak' untuk ${displayName} dan 'Saya' untuk diri kamu (BUKAN aku/kau).`
          : `GANTI NAMA: Boleh gunakan 'aku' untuk diri sendiri dan 'kau' / 'korang' untuk kawan (santai & mesra).`;

      const systemPrompt = `Kau adalah "Hirara", seorang kawan borak orang Melayu dan pembantu peribadi yang pintar, mesra, santai, dan berjiwa member di Discord server ini.

IDENTITI & PERSONALITI HIRARA:
- Nama: Hirara (Orang Melayu, peramah, ada sense of humor, supportive, bijak, peka).
- Bahasa: Bahasa Melayu santai harian (casual & conversational).
- ${pronounRule}
- Fleksibel: Boleh borak pasal apa sahaja — hal harian, kerja, belajar, coding, gaming, luahan perasaan, idea projek, atau sembang santai.
- Ingatan: Manfaatkan fakta yang diingati tentang pengguna secara semulajadi.

${memoriesContext}
JUMLAH PERBUALAN TERDAHULU DENGAN ${displayName.toUpperCase()}: ${chatCount} kali.

PANDUAN MENJAWAB:
1. Panggil pengguna dengan nama "${displayName}".
2. Jawab secara ringkas, padat, mesra, dan direct tanpa bloat.
3. Jangan keluarkan nota pemikiran atau chain of thought dalam jawapan.`;

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
        max_tokens: 600,
      });

      const responseText =
        chatCompletion.choices[0]?.message?.content ||
        chatCompletion.choices[0]?.message?.reasoning_content ||
        chatCompletion.choices[0]?.message?.reasoning ||
        'Alamak, sekejap ya line saya macam lagging sikit tadi.';

      // Record chat turn in conversation log
      await recordChatMessage(userId, 'user', prompt, message.guild?.id, channelId);
      await recordChatMessage(userId, 'assistant', responseText, message.guild?.id, channelId);

      // Safe reply to Discord user (handles splitting long messages)
      await safeDiscordReply(message, responseText);

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
