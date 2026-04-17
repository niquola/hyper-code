function keysPath(home: string): string { return `${home}/.hyper/keys.json`; }
function readKeys(home: string): Record<string, string> {
  try { return JSON.parse(require("node:fs").readFileSync(keysPath(home), "utf-8")); } catch { return {}; }
}
function writeKeys(home: string, keys: Record<string, string>): void {
  const { mkdirSync, writeFileSync } = require("node:fs");
  mkdirSync(`${home}/.hyper`, { recursive: true });
  writeFileSync(keysPath(home), JSON.stringify(keys, null, 2));
}

export default async function chat_saveApiKey(home: string, provider: string, apiKey: string): Promise<void> {
  const keys = readKeys(home);
  keys[provider] = apiKey;
  writeKeys(home, keys);
}
