import type { Ctx } from "../agent/type_Ctx.ts";
import type { Model } from "../ai/type_Model.ts";

export default async function ai_getModels(ctx: Ctx, provider: string): Promise<Model[]> {
  // LM Studio — fetch live models from API
  if (provider === "lmstudio") {
    const models = await ctx.ai.lmstudio_models();
    return Object.values(models) as Model[];
  }

  const providerModels = await ctx.ai.models_loadProvider(ctx, provider);
  if (!providerModels) return [];
  return Object.values(providerModels) as Model[];
}
