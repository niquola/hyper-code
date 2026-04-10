import type { Ctx } from "./agent_type_Ctx.ts";
import type { Model } from "./ai_type_Model.ts";
import { ai_models_loadProvider } from "./ai_models_loadProvider.ts";

export async function ai_getModels(ctx: Ctx, provider: string): Promise<Model[]> {
  const providerModels = await ai_models_loadProvider(ctx, provider);
  if (!providerModels) return [];
  return Object.values(providerModels) as Model[];
}
