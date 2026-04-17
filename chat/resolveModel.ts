import type { ChatSettings } from "./type_ChatSettings.ts";
import type { Model } from "../ai/type_Model.ts";

function resolveBaseUrl(provider: string): string {
  if (provider === "lmstudio") return "http://localhost:1234/v1";
  if (provider === "openai-codex") return "https://chatgpt.com/backend-api";
  if (provider === "openai") return "https://api.openai.com/v1";
  if (provider === "anthropic") return "https://api.anthropic.com";
  if (provider === "kimi-coding") return "https://api.kimi.com/coding";
  return `https://api.${provider}.com/v1`;
}

export default async function chat_resolveModel(cwd: string, settings: ChatSettings): Promise<Model> {
  const ai_models_readProvider = (await import("../ai/models_readProvider.ts")).default;
  const providerModels = await ai_models_readProvider(cwd, settings.provider);
  const model = providerModels ? (providerModels[settings.modelId] as Model | undefined) : undefined;
  if (model) return model;
  return { id: settings.modelId, name: settings.modelId, provider: settings.provider, baseUrl: resolveBaseUrl(settings.provider), reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 };
}
