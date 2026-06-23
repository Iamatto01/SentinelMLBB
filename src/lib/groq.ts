import Groq from 'groq-sdk';
import { db } from './db';

const keysFromEnv = process.env.GROQ_API_KEYS
  ? process.env.GROQ_API_KEYS.split(',').map(k => k.trim())
  : [];

// List of fallback Groq keys from environment variables
const defaultKeys = [
  process.env.GROQ_API_KEY,
];

const API_KEYS = [...keysFromEnv, ...defaultKeys]
  .filter((key): key is string => typeof key === 'string' && key.trim() !== '');

const uniqueKeys = Array.from(new Set(API_KEYS));

// Helper function to execute a chat completion with API key rotation / fallback
async function createChatCompletion(params: Parameters<Groq['chat']['completions']['create']>[0]) {
  let lastError: any = null;

  for (let i = 0; i < uniqueKeys.length; i++) {
    const apiKey = uniqueKeys[i];
    try {
      console.log(`[Groq] Attempting request using API key index ${i}...`);
      const client = new Groq({ apiKey });
      const response = await client.chat.completions.create(params);
      console.log(`[Groq] Request succeeded with key index ${i}.`);
      return response;
    } catch (error: any) {
      console.error(`[Groq] Key index ${i} failed. Error:`, error.message || error);
      lastError = error;
      // Continue to the next key
    }
  }

  throw lastError || new Error("All Groq API keys failed.");
}

export async function getActiveModel(): Promise<string> {
  try {
    await db.execute("CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)");
    const res = await db.execute({
      sql: "SELECT value FROM system_settings WHERE key = :key",
      args: { key: 'active_model' }
    });
    if (res.rows && res.rows[0]) {
      return res.rows[0].value as string;
    }
  } catch (error) {
    console.error("[Groq] Failed to fetch active model from database, using default llama-3.1-8b-instant. Error:", error);
  }
  return 'llama-3.1-8b-instant';
}

export async function setActiveModel(modelName: string): Promise<void> {
  await db.execute("CREATE TABLE IF NOT EXISTS system_settings (key TEXT PRIMARY KEY, value TEXT)");
  await db.execute({
    sql: "INSERT INTO system_settings (key, value) VALUES (:key, :value) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: { key: 'active_model', value: modelName }
  });
}

const groq = {
  chat: {
    completions: {
      create: createChatCompletion
    }
  }
} as unknown as Groq;
// Attach model helpers to the default export so other modules can access them
// via the default import (avoids named-export mismatch during build).
(groq as any).getActiveModel = getActiveModel;
(groq as any).setActiveModel = setActiveModel;

export default groq;
