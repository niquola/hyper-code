import type { Model } from "./type_Model.ts";

const LMSTUDIO_BASE = "http://localhost:1234/v1";

export default async function ai_lmstudio_models(): Promise<Record<string, Model>> {
  try {
    const res = await fetch(`${LMSTUDIO_BASE}/models`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return {};
    const data = await res.json() as any;
    const models: Record<string, Model> = {};

    for (const m of data.data || []) {
      const id = m.id as string;
      if (id.includes("embedding") || id.includes("nomic")) continue; // skip embedding models
      models[id] = {
        id,
        name: id.split("/").pop() || id,
        provider: "lmstudio",
        baseUrl: LMSTUDIO_BASE,
        reasoning: id.includes("reasoning") || id.includes("deepseek-r1"),
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 32000,
      };
    }
    return models;
  } catch {
    return {};
  }
}
