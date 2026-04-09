import { chat_getSession } from "./chat_ctx.ts";

export default async function (req: Request) {
  // Redirect to current session URL
  const session = await chat_getSession();
  return new Response(null, {
    status: 302,
    headers: { Location: `/session/${encodeURIComponent(session.filename)}/` },
  });
}
