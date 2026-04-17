import type { Ctx } from "../agent/type_Ctx.ts";
import type { Model } from "../ai/type_Model.ts";

export default async function ai_getModels(ctx: Ctx, provider: string): Promise<Model[]> {
  const providerModels = await ctx.ai.models_loadProvider(ctx, provider);
  if (!providerModels) return [];
  return Object.values(providerModels) as Model[];
}
