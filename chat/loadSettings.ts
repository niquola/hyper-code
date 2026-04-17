import type { ChatSettings } from "./type_ChatSettings.ts";

const SETTINGS_PATH = ".settings.json";

export default async function chat_loadSettings(): Promise<ChatSettings> {
  try {
    const file = Bun.file(SETTINGS_PATH);
    if (await file.exists()) return await file.json();
  } catch {}
  return { provider: "lmstudio", modelId: "qwen3-coder-next", apiKey: "lm-studio" };
}
