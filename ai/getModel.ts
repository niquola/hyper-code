import type { Ctx } from "../agent/type_Ctx.ts";
import type { Model } from "../ai/type_Model.ts";

export async function ai_getModel(ctx: Ctx, provider: string, modelId: string): Promise<Model | undefined> {
  const providerModels = await ctx.ai.models_loadProvider(ctx, provider);
  if (!providerModels) return undefined;
  return providerModels[modelId] as Model | undefined;
}
