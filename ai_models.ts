import type { Model } from "./ai_type_Model.ts";

export const AI_MODELS: Record<string, Model> = {
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 16_384,
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    reasoning: false,
    input: ["text", "image"],
    cost: { input: 0.15, output: 0.6, cacheRead: 0.075, cacheWrite: 0 },
    contextWindow: 128_000,
    maxTokens: 16_384,
  },
  "o3-mini": {
    id: "o3-mini",
    name: "o3-mini",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    reasoning: true,
    input: ["text"],
    cost: { input: 1.1, output: 4.4, cacheRead: 0.55, cacheWrite: 0 },
    contextWindow: 200_000,
    maxTokens: 100_000,
  },
};
