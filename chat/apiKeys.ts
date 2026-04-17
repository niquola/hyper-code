// Per-provider API key storage — ~/.hyper/keys.json (global, shared across projects)
// Priority: ENV → ~/.hyper/keys.json → auto-detect (kimi CLI etc.)
import ai_getEnvApiKey from "../ai/getEnvApiKey.ts";

function keysPath(home: string): string {
  return `${home}/.hyper/keys.json`;
}

function readKeys(home: string): Record<string, string> {
  try { return JSON.parse(require("node:fs").readFileSync(keysPath(home), "utf-8")); } catch { return {}; }
}

function writeKeys(home: string, keys: Record<string, string>): void {
  const { mkdirSync, writeFileSync } = require("node:fs");
  mkdirSync(`${home}/.hyper`, { recursive: true });
  writeFileSync(keysPath(home), JSON.stringify(keys, null, 2));
}

export async function chat_saveApiKey(home: string, provider: string, apiKey: string): Promise<void> {
  const keys = readKeys(home);
  keys[provider] = apiKey;
  writeKeys(home, keys);
}

export async function chat_getApiKey(home: string, provider: string): Promise<string> {
  // 1. Env override (auto-detect from CLI creds)
  const envKey = ai_getEnvApiKey(home, provider);
  if (envKey) return envKey;

  // 2. ~/.hyper/keys.json
  const keys = readKeys(home);
  if (keys[provider]) return keys[provider]!;

  return "";
}
