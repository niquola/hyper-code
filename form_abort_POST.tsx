import { chat_getCtx } from "./chat_ctx.ts";
import { agent_abort } from "./agent_abort.ts";

export default async function (req: Request) {
  agent_abort(chat_getCtx());
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
