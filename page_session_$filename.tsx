import { chat_switchSession } from "./chat_ctx.ts";

export default async function (req: Request, params: { filename: string }) {
  await chat_switchSession(decodeURIComponent(params.filename));
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
