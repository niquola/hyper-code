import type { Ctx } from "./agent_type_Ctx.ts";

export function agent_reset(ctx: Ctx): void {
  ctx.abortController?.abort();
  ctx.messages = [];
  ctx.isStreaming = false;
  ctx.abortController = null;
}
