import { db } from './db';
import llm from './groq';

// ============================================================
// HIRARA MEMORY & REMINDER ENGINE
// Long-term dynamic learning, auto-fact extraction, reminders
// ============================================================

export interface UserMemory {
  id?: number;
  user_id: string;
  category: 'identity' | 'preference' | 'habit' | 'relationship' | 'project' | 'general';
  memory_key: string;
  memory_value: string;
  importance: number;
  updated_at?: string;
}

export interface HiraraReminder {
  id?: number;
  user_id: string;
  channel_id: string;
  remind_at_ms: number;
  reminder_text: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at?: string;
}

// ── 1. Database Schema Initialization ─────────────────────────
export async function initHiraraDatabase(): Promise<void> {
  try {
    // Dynamic facts & learned memories about users
    await db.execute(`
      CREATE TABLE IF NOT EXISTS hirara_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        memory_key TEXT NOT NULL,
        memory_value TEXT NOT NULL,
        importance INTEGER DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, memory_key)
      )
    `);

    // Full conversational message log
    await db.execute(`
      CREATE TABLE IF NOT EXISTS hirara_conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT,
        channel_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Smart reminder and alarm table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS hirara_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        remind_at_ms INTEGER NOT NULL,
        reminder_text TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User profile summaries
    await db.execute(`
      CREATE TABLE IF NOT EXISTS hirara_user_profiles (
        user_id TEXT PRIMARY KEY,
        nickname TEXT,
        pronoun TEXT DEFAULT 'kau',
        personality_notes TEXT,
        chat_count INTEGER DEFAULT 0,
        last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // GitHub Whitelist Access Control Table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS hirara_github_access (
        user_id TEXT PRIMARY KEY,
        username TEXT,
        role TEXT DEFAULT 'authorized',
        added_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[Hirara DB] Schema successfully verified & initialized.');
  } catch (err) {
    console.error('[Hirara DB] Initialization error:', err);
  }
}

// ── GitHub Access Control System ──────────────────────────────
export async function isUserAuthorizedForGitHub(
  userId: string,
  username: string
): Promise<{ authorized: boolean; isOwner: boolean }> {
  await initHiraraDatabase();

  const ownerEnvId = process.env.BOT_OWNER_ID || '';
  const ownerEnvUser = (process.env.GITHUB_USERNAME || 'iamatto01').toLowerCase();
  const lowerUser = (username || '').toLowerCase();

  // 1. Owner check
  const isOwner =
    (ownerEnvId && userId === ownerEnvId) ||
    lowerUser === 'iamatto01' ||
    lowerUser.includes('iamatto') ||
    lowerUser === ownerEnvUser;

  if (isOwner) {
    return { authorized: true, isOwner: true };
  }

  // 2. Database whitelist check
  const res = await db.execute({
    sql: 'SELECT role FROM hirara_github_access WHERE user_id = ?',
    args: [userId],
  }).catch(() => ({ rows: [] }));

  if (res.rows.length > 0) {
    return { authorized: true, isOwner: false };
  }

  return { authorized: false, isOwner: false };
}

export async function grantGitHubAccess(
  targetUserId: string,
  targetUsername: string,
  addedBy: string
): Promise<void> {
  await initHiraraDatabase();
  await db.execute({
    sql: `INSERT INTO hirara_github_access (user_id, username, role, added_by, created_at)
          VALUES (?, ?, 'authorized', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, added_by = excluded.added_by`,
    args: [targetUserId, targetUsername, addedBy],
  });
}

export async function revokeGitHubAccess(targetUserId: string): Promise<boolean> {
  await initHiraraDatabase();
  const res = await db.execute({
    sql: 'DELETE FROM hirara_github_access WHERE user_id = ?',
    args: [targetUserId],
  }).catch(() => ({ rows: [] }));
  return true;
}

export async function listAuthorizedGitHubUsers(): Promise<{ user_id: string; username: string; role: string }[]> {
  await initHiraraDatabase();
  const res = await db.execute('SELECT user_id, username, role FROM hirara_github_access ORDER BY created_at ASC')
    .catch(() => ({ rows: [] }));
  return res.rows as any[];
}

// ── 2. Memory Retrieval for AI Context ────────────────────────
export async function getUserHiraraContext(userId: string, username: string): Promise<{
  displayName: string;
  memoriesList: string[];
  recentHistory: { role: 'user' | 'assistant'; content: string }[];
  chatCount: number;
  pronoun: string;
}> {
  await initHiraraDatabase();

  // Get or initialize profile
  const profRes = await db.execute({
    sql: 'SELECT nickname, chat_count, pronoun FROM hirara_user_profiles WHERE user_id = ?',
    args: [userId],
  }).catch(() => ({ rows: [] }));

  let displayName = username;
  let chatCount = 0;
  let pronoun = 'kau';

  if (profRes.rows.length > 0) {
    const row = profRes.rows[0];
    displayName = row.nickname || username;
    chatCount = row.chat_count || 0;
    pronoun = row.pronoun || 'kau';
  } else {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO hirara_user_profiles (user_id, nickname, chat_count, pronoun) VALUES (?, ?, 0, "kau")',
      args: [userId, username],
    }).catch(() => {});
  }

  // Get learned memories / facts
  const memRes = await db.execute({
    sql: 'SELECT category, memory_key, memory_value FROM hirara_memories WHERE user_id = ? ORDER BY importance DESC, updated_at DESC LIMIT 30',
    args: [userId],
  }).catch(() => ({ rows: [] }));

  const memoriesList: string[] = [];
  for (const m of memRes.rows) {
    if (m.memory_key === 'nickname') {
      displayName = m.memory_value;
    }
    if (m.memory_key === 'ganti_nama' || m.memory_key === 'panggilan') {
      pronoun = m.memory_value;
    }
    memoriesList.push(`[${m.category}] ${m.memory_key}: ${m.memory_value}`);
  }

  // Get recent 12 conversation messages
  const histRes = await db.execute({
    sql: 'SELECT role, content FROM hirara_conversations WHERE user_id = ? ORDER BY timestamp DESC LIMIT 12',
    args: [userId],
  }).catch(() => ({ rows: [] }));

  const recentHistory = histRes.rows.reverse().map((r) => ({
    role: r.role as 'user' | 'assistant',
    content: r.content as string,
  }));

  return { displayName, memoriesList, recentHistory, chatCount, pronoun };
}

// ── 3. Save Chat Message ──────────────────────────────────────
export async function recordChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  guildId?: string,
  channelId?: string
): Promise<void> {
  try {
    await db.execute({
      sql: 'INSERT INTO hirara_conversations (user_id, guild_id, channel_id, role, content) VALUES (?, ?, ?, ?, ?)',
      args: [userId, guildId || null, channelId || null, role, content],
    });

    if (role === 'user') {
      await db.execute({
        sql: 'UPDATE hirara_user_profiles SET chat_count = chat_count + 1, last_seen = CURRENT_TIMESTAMP WHERE user_id = ?',
        args: [userId],
      });
    }
  } catch (err) {
    console.warn('[Hirara DB] Record message error:', err);
  }
}

// ── 4. Save Explicit or Extracted Memory ───────────────────────
export async function saveUserMemory(
  userId: string,
  key: string,
  value: string,
  category: UserMemory['category'] = 'general',
  importance = 1
): Promise<void> {
  try {
    await db.execute({
      sql: `INSERT INTO hirara_memories (user_id, category, memory_key, memory_value, importance, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, memory_key)
            DO UPDATE SET memory_value = excluded.memory_value, category = excluded.category, importance = excluded.importance, updated_at = CURRENT_TIMESTAMP`,
      args: [userId, category, key.trim().toLowerCase(), value.trim(), importance],
    });
  } catch (err) {
    console.error('[Hirara DB] Save memory error:', err);
  }
}

// ── 5. Background Dynamic Memory Extraction (Makes AI Smarter) ──
export async function extractAndLearnMemories(
  userId: string,
  displayName: string,
  userMessage: string,
  botReply: string
): Promise<void> {
  try {
    const lower = userMessage.toLowerCase();

    // Fast Regex rules for common instant facts
    const nameMatch = userMessage.match(/(?:panggil aku|nama (?:aku|saya)|name is|my name is|panggilan aku)\s+([A-Za-z0-9_-]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      if (name.length > 1 && !['siapa', 'apa', 'awak', 'kamu', 'kau'].includes(name.toLowerCase())) {
        await saveUserMemory(userId, 'nickname', name, 'identity', 5);
        await db.execute({
          sql: 'UPDATE hirara_user_profiles SET nickname = ? WHERE user_id = ?',
          args: [name, userId],
        });
      }
    }

    if (lower.includes('jgn guna bro') || lower.includes('jangan panggil bro') || lower.includes('bukan bro')) {
      await saveUserMemory(userId, 'larangan_kata', 'Jangan panggil bro', 'preference', 4);
    }

    if (/pakai awak saya|guna awak saya|panggil awak saya|pakai saya awak|guna saya awak|tukar ke awak saya/i.test(lower)) {
      await saveUserMemory(userId, 'ganti_nama', 'awak_saya', 'preference', 5);
      await db.execute({
        sql: "UPDATE hirara_user_profiles SET pronoun = 'awak_saya' WHERE user_id = ?",
        args: [userId],
      });
    } else if (/pakai kau aku|guna kau aku|panggil kau aku|tukar ke kau aku/i.test(lower)) {
      await saveUserMemory(userId, 'ganti_nama', 'kau_aku', 'preference', 5);
      await db.execute({
        sql: "UPDATE hirara_user_profiles SET pronoun = 'kau_aku' WHERE user_id = ?",
        args: [userId],
      });
    }

    // Check if the user shared personal facts, preferences, hobbies, job, study, feelings
    const factSignals = /(?:aku suka|saya suka|hobi aku|kerja aku|aku belajar|projek aku|kawan aku|aku ada|aku tak suka|makanan fav|fav aku|aku tengah|umur aku|aku tinggal|rumah aku)/i;
    if (factSignals.test(userMessage) && userMessage.length > 8) {
      // Async LLM distillation for high quality memory extraction
      extractFactViaLLM(userId, displayName, userMessage).catch((e) =>
        console.warn('[Hirara Memory Extraction] LLM task notice:', e.message)
      );
    }
  } catch (err) {
    console.warn('[Hirara Memory Extraction] Warning:', err);
  }
}

async function extractFactViaLLM(userId: string, userName: string, userText: string) {
  try {
    const prompt = `Analisa teks dari user "${userName}" ini dan ekstrak fakta penting tentang diri dia jika ada.
Teks: "${userText}"

Format output WAJIB JSON Array of objects:
[{"category": "identity|preference|habit|relationship|project|general", "key": "ringkasan_kunci (cth: makanan_kegemaran, projek_semasa)", "value": "nilai fakta yang padat", "importance": 1-5}]

Jika TIADA fakta peribadi baharu atau hanya sembang kosong, balas hanya: []
Balas HANYA JSON tanpa teks lain.`;

    const res = await llm.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 250,
    });

    const raw = res.choices[0]?.message?.content || res.choices[0]?.message?.reasoning || '[]';
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const items = JSON.parse(jsonMatch[0]);
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.key && item.value) {
            await saveUserMemory(
              userId,
              item.key,
              item.value,
              item.category || 'general',
              item.importance || 2
            );
            console.log(`[Hirara Memory] Learned new fact about ${userName}: ${item.key} = ${item.value}`);
          }
        }
      }
    }
  } catch (err: any) {
    // Ignore extraction parsing errors silently
  }
}

// ── 6. Reminder System ─────────────────────────────────────────
export async function createReminder(
  userId: string,
  channelId: string,
  remindAtMs: number,
  text: string
): Promise<void> {
  await initHiraraDatabase();
  await db.execute({
    sql: 'INSERT INTO hirara_reminders (user_id, channel_id, remind_at_ms, reminder_text, status) VALUES (?, ?, ?, ?, "pending")',
    args: [userId, channelId, remindAtMs, text.trim()],
  });
}

export async function getDueReminders(): Promise<HiraraReminder[]> {
  await initHiraraDatabase();
  const now = Date.now();
  const res = await db.execute({
    sql: 'SELECT id, user_id, channel_id, remind_at_ms, reminder_text, status FROM hirara_reminders WHERE status = "pending" AND remind_at_ms <= ?',
    args: [now],
  }).catch(() => ({ rows: [] }));

  return res.rows as HiraraReminder[];
}

export async function markReminderDone(reminderId: number): Promise<void> {
  await db.execute({
    sql: 'UPDATE hirara_reminders SET status = "completed" WHERE id = ?',
    args: [reminderId],
  });
}

export async function getUserPendingReminders(userId: string): Promise<HiraraReminder[]> {
  await initHiraraDatabase();
  const res = await db.execute({
    sql: 'SELECT id, user_id, channel_id, remind_at_ms, reminder_text, status FROM hirara_reminders WHERE user_id = ? AND status = "pending" ORDER BY remind_at_ms ASC',
    args: [userId],
  }).catch(() => ({ rows: [] }));

  return res.rows as HiraraReminder[];
}
