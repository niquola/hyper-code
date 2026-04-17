import type { Ctx } from "../agent/type_Ctx.ts";
import type { Model } from "../ai/type_Model.ts";

export default async function ctx.ai.models_loadProvider(ctx: Ctx, provider: string): Promise<Record<string, Model> | null> {
  const cached = ctx.modelProviders.get(provider);
  if (cached) return cached;

  const data = await ctx.ai.models_readProvider(ctx.cwd, provider);
  if (!data) return null;

  ctx.modelProviders.set(provider, data);
  return data;
}
