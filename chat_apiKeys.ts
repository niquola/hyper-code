// Per-provider API key storage in .hyper/keys/<provider>.json
import { ai_getEnvApiKey } from "./ai_getEnvApiKey.ts";

const KEYS_DIR = (process.env.HYPER_SESSION_DIR || ".hyper") + "/keys";

export async function chat_saveApiKey(provider: string, apiKey: string, extra?: Record<string, unknown>): Promise<void> {
  const { mkdirSync } = require("node:fs");
  mkdirSync(KEYS_DIR, { recursive: true });
  await Bun.write(`${KEYS_DIR}/${provider}.json`, JSON.stringify({ apiKey, ...extra }));
}

export async function chat_getApiKey(provider: string): Promise<string> {
  // 1. Check stored key
  try {
    const file = Bun.file(`${KEYS_DIR}/${provider}.json`);
    if (await file.exists()) {
      const data = await file.json();
      if (data.apiKey) return data.apiKey;
    }
  } catch {}

  // 2. Check env / auto-detect (kimi CLI, etc.)
  return ai_getEnvApiKey(provider) || "";
}
