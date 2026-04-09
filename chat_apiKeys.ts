// Per-provider API key storage — ~/.hyper/keys.json (global, shared across projects)
// Priority: ENV → ~/.hyper/keys.json → auto-detect (kimi CLI etc.)
import { ai_getEnvApiKey } from "./ai_getEnvApiKey.ts";

const KEYS_PATH = `${process.env.HOME || "/tmp"}/.hyper/keys.json`;

function readKeys(): Record<string, string> {
  try { return JSON.parse(require("node:fs").readFileSync(KEYS_PATH, "utf-8")); } catch { return {}; }
}

function writeKeys(keys: Record<string, string>): void {
  const { mkdirSync, writeFileSync } = require("node:fs");
  mkdirSync(`${process.env.HOME || "/tmp"}/.hyper`, { recursive: true });
  writeFileSync(KEYS_PATH, JSON.stringify(keys, null, 2));
}

export async function chat_saveApiKey(provider: string, apiKey: string): Promise<void> {
  const keys = readKeys();
  keys[provider] = apiKey;
  writeKeys(keys);
}

export async function chat_getApiKey(provider: string): Promise<string> {
  // 1. Env override
  const envKey = ai_getEnvApiKey(provider);
  if (envKey) return envKey;

  // 2. ~/.hyper/keys.json
  const keys = readKeys();
  if (keys[provider]) return keys[provider]!;

  return "";
}
