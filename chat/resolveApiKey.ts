import type { ChatSettings } from "./type_ChatSettings.ts";

export default function chat_resolveApiKey(home: string, settings: ChatSettings): string {
  if (settings.apiKey) return settings.apiKey;
  const ai_getEnvApiKey = require("../ai/getEnvApiKey.ts").default;
  return ai_getEnvApiKey(home, settings.provider) || "";
}
