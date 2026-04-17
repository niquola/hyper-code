import type { Ctx } from "../agent/type_Ctx.ts";
import type { Model } from "../ai/type_Model.ts";
import { ai_models_readProvider } from "./models_readProvider.ts";

export async function ai_models_loadProvider(ctx: Ctx, provider: string): Promise<Record<string, Model> | null> {
  const cached = ctx.modelProviders.get(provider);
  if (cached) return cached;

  const data = await ai_models_readProvider(ctx.cwd, provider);
  if (!data) return null;

  ctx.modelProviders.set(provider, data);
  return data;
}
