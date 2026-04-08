import type { Ctx } from "./agent_type_Ctx.ts";

export function agent_abort(ctx: Ctx): void {
  ctx.abortController?.abort();
}
