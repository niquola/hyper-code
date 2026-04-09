import { chat_resetCtx } from "./chat_ctx.ts";

export default async function (req: Request) {
  chat_resetCtx();
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
