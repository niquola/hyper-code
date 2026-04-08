import { chat_getCtx } from "./chat_ctx.ts";
import { agent_reset } from "./agent_reset.ts";

export default async function (req: Request) {
  agent_reset(chat_getCtx());
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
