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
import {
  listUserRepositories,
  explainRepositoryWithHirara,
  getDefaultGitHubUsername,
} from '../src/lib/github';
import { llm } from '../src/lib/groq';
import { db } from '../src/lib/db';

dotenv.config({ path: '.env.local' });

// ============================================================
// HIRARA — AI Personal Companion & Smart Assistant
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

  // 3. Remove English meta-analysis ("Actually, parsing more naturally...", "Here's a thinking process...")
  if (
    /^(?:Here's a thinking process|Thinking Process|Let's think about this|The user is asking|Actually,\s*parsing)/i.test(
      cleaned
    )
  ) {
    const paragraphs = cleaned.split(/\n\s*\n/);
    const nonReasoning = paragraphs.filter(
      (p) =>
        !/^(?:[0-9]+\.|\* |- |Here's|Let's|The user|I should|My goal|First,|Actually,|Given the AI)/i.test(
          p.trim()
        )
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

// ── Smart Multi-Language Timer / Reminder Parser ──────────────
function parseSmartReminder(rawPrompt: string): {
  remindAtMs: number;
  reminderText: string;
  timeFormatted: string;
} | null {
  const text = rawPrompt.toLowerCase();

  // Words to numbers dictionary
  const wordMap: Record<string, number> = {
    setengah: 0.5,
    separuh: 0.5,
    se: 1,
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
    sebelas: 11,
    'dua belas': 12,
    'lima belas': 15,
    'dua puluh': 20,
    'tiga puluh': 30,
    'empat puluh': 40,
    'lima puluh': 50,
  };

  let durationMs = 0;
  let timeFormatted = '';

  // Pattern 1: Word idioms "sejam", "seminit", "setengah jam"
  if (/\bsejam\b/i.test(text)) {
    durationMs = 60 * 60 * 1000;
    timeFormatted = '1 jam';
  } else if (/\bseminit\b/i.test(text)) {
    durationMs = 60 * 1000;
    timeFormatted = '1 minit';
  } else if (/\bsetengah jam\b|\bseparuh jam\b/i.test(text)) {
    durationMs = 30 * 60 * 1000;
    timeFormatted = '30 minit';
  }

  // Pattern 2: [digit or word] [saat/minit/jam/hari]
  if (durationMs === 0) {
    const durationRegex =
      /(?:(\d+(?:\.\d+)?)|(satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|sebelas|dua belas|lima belas|dua puluh|tiga puluh|empat puluh|lima puluh|setengah))\s*(saat|sec|second|seconds|minit|min|minute|minutes|jam|hour|hours|hari|day|days)/i;
    const match = text.match(durationRegex);
    if (match) {
      let num = 1;
      if (match[1]) {
        num = parseFloat(match[1]);
      } else if (match[2] && wordMap[match[2].toLowerCase()] !== undefined) {
        num = wordMap[match[2].toLowerCase()];
      }

      const unit = match[3].toLowerCase();
      if (unit.startsWith('saat') || unit.startsWith('sec')) {
        durationMs = num * 1000;
        timeFormatted = `${num} saat`;
      } else if (unit.startsWith('min')) {
        durationMs = num * 60 * 1000;
        timeFormatted = `${num} minit`;
      } else if (unit.startsWith('jam') || unit.startsWith('hour')) {
        durationMs = num * 60 * 60 * 1000;
        timeFormatted = `${num} jam`;
      } else if (unit.startsWith('hari') || unit.startsWith('day')) {
        durationMs = num * 24 * 60 * 60 * 1000;
        timeFormatted = `${num} hari`;
      }
    }
  }

  // Pattern 3: Absolute time "pukul 10.30 pm", "jam 9 malam", "at 8:00 am"
  if (durationMs === 0) {
    const absTimeRegex =
      /(?:pukul|jam|at)\s*(\d{1,2})(?:[\.:](\d{2}))?\s*(am|pm|pagi|malam|petang|tengahari)?/i;
    const absMatch = text.match(absTimeRegex);
    if (absMatch) {
      let hours = parseInt(absMatch[1], 10);
      const mins = absMatch[2] ? parseInt(absMatch[2], 10) : 0;
      const period = (absMatch[3] || '').toLowerCase();

      if ((period === 'pm' || period === 'malam' || period === 'petang') && hours < 12)
        hours += 12;
      if ((period === 'am' || period === 'pagi') && hours === 12) hours = 0;

      const now = new Date();
      const targetDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        mins,
        0
      );
      if (targetDate.getTime() <= now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1); // Tomorrow if already passed
      }

      durationMs = targetDate.getTime() - now.getTime();
      timeFormatted = targetDate.toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  if (durationMs <= 0) return null;

  const remindAtMs = Date.now() + durationMs;

  // Clean the action text from the prompt
  let actionText = rawPrompt
    .replace(/^(?:hirara|weh hirara|eh hirara)[,\s]*/gi, '')
    .replace(
      /(?:set time|set timer|timer|set alarm|alarm|set reminder|reminder|ingatkan aku|ingatkan saya|ingatkan|remind me to|remind me|tolong ingatkan)/gi,
      ''
    )
    .replace(
      /(?:dalam|lagi|in|selepas|lepas)\s*(?:\d+|satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|setengah)\s*(?:saat|sec|second|seconds|minit|min|minute|minutes|jam|hour|hours|hari|day|days)/gi,
      ''
    )
    .replace(
      /(?:\d+|satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh|setengah)\s*(?:saat|sec|second|seconds|minit|min|minute|minutes|jam|hour|hours|hari|day|days)\s*(?:lagi|later)/gi,
      ''
    )
    .replace(/(?:pukul|jam|at)\s*\d{1,2}(?:[\.:]\d{2})?\s*(?:am|pm|pagi|malam|petang|tengahari)?/gi, '')
    .replace(/^[,:\s-]+|[,:\s-]+$/g, '')
    .trim();

  // If user said "lepas tu mention @user", format cleanly
  if (
    !actionText ||
    actionText.toLowerCase() === 'lepas tu' ||
    actionText.toLowerCase() === 'nanti' ||
    actionText.toLowerCase() === 'lepas ni'
  ) {
    actionText = `Masa ${timeFormatted} dah tamat!`;
  }

  return {
    remindAtMs,
    reminderText: actionText,
    timeFormatted,
  };
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

    // Remove ONLY the bot's own mention so other mentions (like target users) are preserved!
    const botId = client.user?.id;
    const prompt = message.content
      .replace(new RegExp(`<@!?${botId}>`, 'gi'), '')
      .trim();

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
      const isCheckReminder =
        /ada reminder|check reminder|senarai reminder|what are my reminder|tengok alarm|ada alarm/i.test(
          lower
        );
      if (isCheckReminder) {
        const pending = await getUserPendingReminders(userId);
        if (pending.length === 0) {
          const userPronoun = pronoun === 'awak_saya' ? 'awak' : 'kau';
          await message.reply(
            `📋 **${displayName}**, ${userPronoun} tak ada sebarang peringatan/alarm yang aktif sekarang. Kalau nak saya ingatkan apa-apa, bagitahu je cth: *"Hirara, set timer 1 minit..."*!`
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

      // ── 4. Smart Timer & Reminder Detection ──────────────────
      const parsedTimer = parseSmartReminder(prompt);
      if (parsedTimer) {
        await createReminder(userId, channelId, parsedTimer.remindAtMs, parsedTimer.reminderText);
        const tagWord = pronoun === 'awak_saya' ? 'awak' : 'kau';
        await message.reply(
          `⏰ **Beres, ${displayName}!** Saya dah setkan pemasa/peringatan untuk **${parsedTimer.timeFormatted}**!\n> 📌 **${parsedTimer.reminderText}**\n\nNanti cukup masa saya terus tag ${tagWord} kat sini! ✨`
        );
        return;
      }

      // ── 5. GitHub Repository Listing ─────────────────────────
      if (
        /(?:senarai|list|tunjuk|tengok)\s+(?:repo|projek|project|repository)(?:\s+(?:aku|kat|di|github))?/i.test(
          lower
        ) ||
        /(?:projek|repo)\s+(?:kat|di|dalam)?\s*github/i.test(lower)
      ) {
        const defaultUser = getDefaultGitHubUsername();
        const repos = await listUserRepositories(defaultUser);
        if (repos.length === 0) {
          await message.reply(
            `Saya belum dapat tarik sebarang repository dari GitHub **${defaultUser}** lagi. Pastikan akaun GitHub wujud dan ada repository public!`
          );
          return;
        }

        let repoMsg = `🐙 **Senarai Repository GitHub (${defaultUser}):**\n\n`;
        repos.slice(0, 10).forEach((r, idx) => {
          const stars = r.stars > 0 ? ` ⭐${r.stars}` : '';
          const lang = r.language ? ` • \`${r.language}\`` : '';
          repoMsg += `${idx + 1}. **[${r.name}](${r.html_url})**${lang}${stars}\n   > *${r.description}* (Kemaskini: ${r.updated_at})\n`;
        });
        repoMsg += `\n💡 *Tip: Tanya saya cth: "@Sentinel MLBB terangkan pasal projek ${repos[0]?.name}" untuk penerangan kod & fungsi projek!*`;

        await safeDiscordReply(message, repoMsg);
        return;
      }

      // ── 6. GitHub Repository Explainer ───────────────────────
      const explainMatch =
        prompt.match(
          /(?:terangkan|explain|apa fungsi|ceritakan pasal|penerangan pasal|detail pasal|apa itu)\s+(?:projek|repo|project|repository)?\s*([a-zA-Z0-9_-]+)/i
        ) ||
        prompt.match(
          /(?:projek|repo)\s+([a-zA-Z0-9_-]+)\s+(?:pasal apa|fungsi apa|tentang apa|buat apa|macam mana)/i
        );

      if (
        explainMatch &&
        explainMatch[1] &&
        !['aku', 'saya', 'dia', 'awak', 'kau', 'kita', 'apa', 'ini', 'tu', 'siapa', 'mana'].includes(
          explainMatch[1].toLowerCase()
        )
      ) {
        const targetRepo = explainMatch[1].trim();
        const defaultUser = getDefaultGitHubUsername();
        const explanation = await explainRepositoryWithHirara(
          targetRepo,
          prompt,
          defaultUser,
          pronoun
        );
        await safeDiscordReply(message, explanation);

        // Save into memory that user has interest in this project
        await saveUserMemory(
          userId,
          `minat_projek_${targetRepo}`,
          `Pengguna bertanya tentang projek GitHub ${targetRepo}`,
          'project',
          3
        );
        return;
      }

      // ── 7. AI Conversational Generation with Hirara Persona ──
      const memoriesContext =
        memoriesList.length > 0
          ? `DETAIL & FAKTA DIINGATI PASAL ${displayName.toUpperCase()}:\n${memoriesList.join('\n')}`
          : `(Belum ada detail khusus pasal ${displayName}, kenali diri pengguna secara semulajadi semasa borak)`;

      const pronounRule =
        pronoun === 'awak_saya' ||
        /pakai awak saya|guna awak saya|panggil awak saya|awak saya/i.test(lower)
          ? `GANTI NAMA: Gunakan panggilan 'Awak' untuk ${displayName} dan 'Saya' untuk diri kamu (BUKAN aku/kau).`
          : `GANTI NAMA: Boleh gunakan 'aku' untuk diri sendiri dan 'kau' / 'korang' untuk kawan (santai & mesra).`;

      const systemPrompt = `Kau adalah "Hirara", seorang kawan borak orang Melayu dan pembantu peribadi yang pintar, mesra, santai, dan berjiwa member di Discord server ini.

IDENTITI & PERSONALITI HIRARA:
- Nama: Hirara (Orang Melayu, peramah, ada sense of humor, supportive, bijak, peka).
- Bahasa: Bahasa Melayu santai harian (casual & conversational).
- ${pronounRule}
- Fleksibel: Boleh borak pasal apa sahaja — hal harian, kerja, belajar, coding, gaming, luahan perasaan, idea projek, GitHub, atau sembang santai.
- Integrasi GitHub: Kamu boleh membaca repository GitHub pengguna (${getDefaultGitHubUsername()}) dan menerangkan projek kod mereka bila ditanya.
- Ingatan: Manfaatkan fakta yang diingati tentang pengguna secara semulajadi.

${memoriesContext}
JUMLAH PERBUALAN TERDAHULU DENGAN ${displayName.toUpperCase()}: ${chatCount} kali.

PERATURAN PENTING:
1. JANGAN SESEKALI keluarkan monolog bahasa Inggeris, analisis pemikiran ("Actually, parsing more naturally...", "Here's a thinking process...").
2. Sentiasa balas TERUS kepada ${displayName} dalam Bahasa Melayu yang mesra dan natural.
3. Jawab secara ringkas, padat, dan bersahaja.`;

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

      // Safe reply to Discord user (handles clean formatting & splitting long messages)
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

// ── Background Reminder Scheduler (Checks every 5 seconds) ────
function startReminderScheduler(client: Client) {
  setInterval(async () => {
    try {
      const dueReminders = await getDueReminders();

      for (const item of dueReminders) {
        try {
          const channel = (await client.channels.fetch(item.channel_id)) as any;
          if (channel && channel.send) {
            await channel.send(
              `🔔 <@${item.user_id}> **Peringatan daripada Hirara!**\n> 📌 **${item.reminder_text}**\n*Masa dah sampai! ✨*`
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
  }, 5000);
}

startHiraraBot().catch(console.error);
