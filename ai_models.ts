// Barrel: AI model registry
import type { Model } from "./ai_type_Model.ts";
import { MODELS } from "./ai_models_generated.ts";

export { MODELS } from "./ai_models_generated.ts";
export { ai_getModel } from "./ai_getModel.ts";
export { ai_getModels } from "./ai_getModels.ts";
export { ai_getProviders } from "./ai_getProviders.ts";

// Flat lookup by model id (searches all providers)
export const AI_MODELS: Record<string, Model> = {};
for (const [_provider, models] of Object.entries(MODELS)) {
  for (const [id, model] of Object.entries(models)) {
    AI_MODELS[id] = model as unknown as Model;
  }
}
