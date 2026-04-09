// Per-provider API key storage — SQLite backed with env fallback
import { getDb } from "./chat_db.ts";
import { ai_getEnvApiKey } from "./ai_getEnvApiKey.ts";

export async function chat_saveApiKey(provider: string, apiKey: string, extra?: Record<string, unknown>): Promise<void> {
  getDb().saveApiKey(provider, apiKey, extra);
}

export async function chat_getApiKey(provider: string): Promise<string> {
  // 1. SQLite stored key
  const stored = getDb().getApiKey(provider);
  if (stored) return stored;

  // 2. Env / auto-detect (kimi CLI credentials, etc.)
  return ai_getEnvApiKey(provider) || "";
}
