import type { Model } from "./ai_type_Model.ts";
import { MODELS } from "./ai_models_generated.ts";

export function ai_getModel(provider: string, modelId: string): Model | undefined {
  const providerModels = (MODELS as any)[provider];
  if (!providerModels) return undefined;
  return providerModels[modelId] as unknown as Model | undefined;
}
