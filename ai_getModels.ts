import type { Model } from "./ai_type_Model.ts";
import { MODELS } from "./ai_models_generated.ts";

export function ai_getModels(provider: string): Model[] {
  const providerModels = (MODELS as any)[provider];
  if (!providerModels) return [];
  return Object.values(providerModels) as unknown as Model[];
}
