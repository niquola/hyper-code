import type { Model } from "./ai_type_Model.ts";
import { MODELS } from "./ai_models_generated.ts";

export { MODELS } from "./ai_models_generated.ts";

export function ai_getModel(provider: string, modelId: string): Model | undefined {
  const providerModels = (MODELS as any)[provider];
  if (!providerModels) return undefined;
  return providerModels[modelId] as unknown as Model | undefined;
}

export function ai_getModels(provider: string): Model[] {
  const providerModels = (MODELS as any)[provider];
  if (!providerModels) return [];
  return Object.values(providerModels) as unknown as Model[];
}

export function ai_getProviders(): string[] {
  return Object.keys(MODELS);
}

// Flat lookup by model id (searches all providers)
export const AI_MODELS: Record<string, Model> = {};
for (const [_provider, models] of Object.entries(MODELS)) {
  for (const [id, model] of Object.entries(models)) {
    AI_MODELS[id] = model as unknown as Model;
  }
}
