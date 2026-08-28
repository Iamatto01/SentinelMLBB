// ============================================================
// LLM Client — OpenRouter (primary) + multi-model fallback
// ============================================================

// ── Available free models on OpenRouter (verified working Aug 2026) ──
const FREE_MODELS = [
  'dots-studio/dots-3-note-preview:free',
  'liquid/lfm-2.5-2.6b:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-3.5-lightning:free',
];

const API_BASE = process.env.LLM_API_BASE || 'https://openrouter.ai/api/v1';
const API_KEY = process.env.LLM_API_KEY || '';
const DEFAULT_MODEL = process.env.LLM_MODEL || FREE_MODELS[0];

// ── Model selection (persisted in DB) ──────────────────────────

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

// ── Conversation Memory ───────────────────────────────────────

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
    console.warn('[Memory] DB unavailable, returning empty:', e);
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
    console.warn('[Memory] DB unavailable, skipping save:', e);
  }
}

// ── OpenRouter chat completion with automatic model fallback ──

async function callOpenRouter(body: any, apiKey: string, apiBase: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // 60 seconds

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

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${errText}`);
  }
  return res.json();
}

async function createChatCompletion(params: any) {
  const requestedModel = params.model || DEFAULT_MODEL;
  const apiBase = process.env.LLM_API_BASE || 'https://openrouter.ai/api/v1';
  const apiKey = process.env.LLM_API_KEY || '';

  if (!apiKey) {
    throw new Error('No LLM_API_KEY configured. Set your OpenRouter API key in .env.local');
  }

  const baseBody: any = {
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
    max_tokens: params.max_tokens ?? 1024,
  };
  if (params.tools) {
    baseBody.tools = params.tools;
    baseBody.tool_choice = params.tool_choice ?? 'auto';
  }

  // Build list of models to try: requested model first, then all free fallbacks
  const modelsToTry = [requestedModel, ...FREE_MODELS.filter(m => m !== requestedModel)];

  let lastErr: any;
  for (const model of modelsToTry) {
    try {
      console.log(`[LLM] Trying model: ${model}`);
      const result = await callOpenRouter({ ...baseBody, model }, apiKey, apiBase);

      // Handle reasoning models that put content in reasoning instead of content
      if (result.choices?.[0]?.message) {
        const msg = result.choices[0].message;
        if (!msg.content && msg.reasoning) {
          msg.content = msg.reasoning;
        }
        if (!msg.content && msg.reasoning_content) {
          msg.content = msg.reasoning_content;
        }
      }

      console.log(`[LLM] Success with model: ${model}`);
      return result;
    } catch (e: any) {
      console.warn(`[LLM] Model ${model} failed: ${e.message}`);
      lastErr = e;
      // If rate limited (429) or model not found (404), try next model
      if (e.message.includes('429') || e.message.includes('404') || e.message.includes('unavailable')) {
        continue;
      }
      // For other errors (auth, network), don't bother trying more models
      if (e.message.includes('401') || e.message.includes('403')) {
        throw e;
      }
    }
  }

  throw lastErr || new Error('All LLM models failed. Check your OpenRouter API key.');
}

// ── Default export ────────────────────────────────────────────

const llm = {
  chat: { completions: { create: createChatCompletion } },
  getActiveModel,
  setActiveModel,
  getConversationMemory,
  saveConversationMemory,
  FREE_MODELS,
} as any;

export { llm };
export default llm;
