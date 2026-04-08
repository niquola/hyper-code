import { ai_getModel, ai_getModels } from "./ai_models.ts";
import { ai_getEnvApiKey } from "./ai_getEnvApiKey.ts";
import type { Model } from "./ai_type_Model.ts";

export type ChatSettings = {
  provider: string;
  modelId: string;
  apiKey: string;
};

// Persist settings to .settings.json
const SETTINGS_PATH = ".settings.json";

export async function chat_loadSettings(): Promise<ChatSettings> {
  try {
    const file = Bun.file(SETTINGS_PATH);
    if (await file.exists()) {
      return await file.json();
    }
  } catch {}

  return {
    provider: "lmstudio",
    modelId: "qwen3-coder-next",
    apiKey: "lm-studio",
  };
}

export async function chat_saveSettings(settings: ChatSettings): Promise<void> {
  await Bun.write(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function chat_resolveModel(settings: ChatSettings): Model {
  // Try to find in registry
  const model = ai_getModel(settings.provider, settings.modelId);
  if (model) return model;

  // Custom model (e.g. LM Studio local)
  return {
    id: settings.modelId,
    name: settings.modelId,
    provider: settings.provider,
    baseUrl: settings.provider === "lmstudio" ? "http://localhost:1234/v1" : `https://api.${settings.provider}.com/v1`,
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 32000,
  };
}

export function chat_resolveApiKey(settings: ChatSettings): string {
  if (settings.apiKey) return settings.apiKey;
  return ai_getEnvApiKey(settings.provider) || "";
}
