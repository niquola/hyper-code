import { chat_getSession } from "./chat_ctx.ts";
import { agent_abort } from "./agent_abort.ts";

export default async function (req: Request) {
  agent_abort(await chat_getSession());
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
