import { MODELS } from "./ai_models_generated.ts";

export function ai_getProviders(): string[] {
  return Object.keys(MODELS);
}
