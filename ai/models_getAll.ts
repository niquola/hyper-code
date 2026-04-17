import type { Ctx } from "../agent/type_Ctx.ts";
import type { Model } from "../ai/type_Model.ts";

export default async function ai_models_getAll(ctx: Ctx): Promise<Record<string, Model>> {
  if (ctx.modelAll) return ctx.modelAll;

  const all: Record<string, Model> = {};
  for (const provider of ctx.modelIndex.providers) {
    const providerModels = await ctx.ai.models_loadProvider(ctx, provider);
    if (!providerModels) continue;
    for (const [id, model] of Object.entries(providerModels)) {
      all[id] = model as Model;
    }
  }

  ctx.modelAll = all;
  return all;
}
