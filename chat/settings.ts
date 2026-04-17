import type { ChatSettings } from "../chat/type_ChatSettings.ts";
import { ai_models_readProvider } from "../ai/models_readProvider.ts";
import { ai_getEnvApiKey } from "../ai/getEnvApiKey.ts";
import type { Model } from "../ai/type_Model.ts";

export type { ChatSettings } from "../chat/type_ChatSettings.ts";

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

function resolveBaseUrl(provider: string): string {
  if (provider === "lmstudio") return "http://localhost:1234/v1";
  if (provider === "openai-codex") return "https://chatgpt.com/backend-api";
  if (provider === "openai") return "https://api.openai.com/v1";
  if (provider === "anthropic") return "https://api.anthropic.com";
  if (provider === "kimi-coding") return "https://api.kimi.com/coding";
  return `https://api.${provider}.com/v1`;
}

export async function chat_resolveModel(cwd: string, settings: ChatSettings): Promise<Model> {
  const providerModels = await ai_models_readProvider(cwd, settings.provider);
  const model = providerModels ? (providerModels[settings.modelId] as Model | undefined) : undefined;
  if (model) return model;

  return {
    id: settings.modelId,
    name: settings.modelId,
    provider: settings.provider,
    baseUrl: resolveBaseUrl(settings.provider),
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 32000,
  };
}

export function chat_resolveApiKey(home: string, settings: ChatSettings): string {
  if (settings.apiKey) return settings.apiKey;
  return ai_getEnvApiKey(home, settings.provider) || "";
}
