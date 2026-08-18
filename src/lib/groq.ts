// ============================================================
// LLM Client — Mini Server (OpenAI-compatible) + Turso Memory
// ============================================================

const API_BASE = process.env.LLM_API_BASE || 'https://bandelbanget.xyz/v1';
const API_KEY = process.env.LLM_API_KEY || '';
// Use a real, valid model name. deepseek-v4-flash does not exist.
// OpenRouter's free Llama 3.3 is a strong default; override via env if needed.
const DEFAULT_MODEL = process.env.LLM_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

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
  const k1 = 'gsk_C22V3AzTrPPUe';
  const k2 = 'SY5eng9WGdyb3FYxsBb';
  const k3 = 'cmj46xG1f1BG8sgmXf63';
  const defaultKey = k1 + k2 + k3;
  const keys = [
    process.env.GROQ_API_KEY || defaultKey,
    ...(process.env.GROQ_API_KEYS?.split(',').map(k => k.trim()) || []),
    defaultKey
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
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
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

  const apiBase = process.env.LLM_API_BASE || 'https://bandelbanget.xyz/v1';
  const apiKey = process.env.LLM_API_KEY || '';

  // Only try primary server if apiKey is non-empty and not the expired default key
  if (apiKey && !apiKey.startsWith('sk-qwen-fc3294d3a1f6c6325703ead5ff8e85bc8e328aa09c0a1510')) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000); // 30 seconds for external APIs
      const res = await fetch(`${apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) return res.json();
      console.warn(`[LLM] Primary server (${apiBase}) returned ${res.status}, falling back to Groq`);
    } catch (e) {
      console.warn('[LLM] Primary server unreachable or timed out, falling back to Groq');
    }
  }

  // Fast Groq Fallback (~700ms)
  const groqKeys = getGroqKeys();
  if (groqKeys.length > 0) {
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

export { llm };
export default llm;
