function keysPath(home: string): string { return `${home}/.hyper/keys.json`; }
function readKeys(home: string): Record<string, string> {
  try { return JSON.parse(require("node:fs").readFileSync(keysPath(home), "utf-8")); } catch { return {}; }
}

export default async function chat_getApiKey(home: string, provider: string): Promise<string> {
  const envKey = (await import("../ai/getEnvApiKey.ts")).default(home, provider);
  if (envKey) return envKey;
  const keys = readKeys(home);
  return keys[provider] || "";
}
