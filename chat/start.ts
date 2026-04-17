import type { Ctx } from "../agent/type_Ctx.ts";
import { sessions, messageCache, setCtx } from "./state.ts";

export default function chat_start(ctx: Ctx) {
  setCtx(ctx);
  sessions.clear();
  messageCache.clear();
}
