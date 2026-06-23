import Groq from 'groq-sdk';

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

const groq = {
  chat: {
    completions: {
      create: createChatCompletion
    }
  }
} as unknown as Groq;

export default groq;

