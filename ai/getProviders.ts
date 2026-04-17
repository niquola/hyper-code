import type { Ctx } from "../agent/type_Ctx.ts";

export function ai_getProviders(ctx: Ctx): string[] {
  return ctx.modelIndex.providers;
}
