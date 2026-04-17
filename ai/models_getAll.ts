import type { Ctx } from "../agent_type_Ctx.ts";
import type { Model } from "../ai_type_Model.ts";
import { ai_models_loadProvider } from "./models_loadProvider.ts";

export async function ai_models_getAll(ctx: Ctx): Promise<Record<string, Model>> {
  if (ctx.modelAll) return ctx.modelAll;

  const all: Record<string, Model> = {};
  for (const provider of ctx.modelIndex.providers) {
    const providerModels = await ai_models_loadProvider(ctx, provider);
    if (!providerModels) continue;
    for (const [id, model] of Object.entries(providerModels)) {
      all[id] = model as Model;
    }
  }

  ctx.modelAll = all;
  return all;
}
