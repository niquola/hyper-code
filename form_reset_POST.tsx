import { chat_switchSession } from "./chat_ctx.ts";
import { chat_sessionCreate } from "./chat_session.ts";

export default async function (req: Request) {
  const filename = chat_sessionCreate();
  await chat_switchSession(filename);
  return new Response(null, {
    status: 302,
    headers: { Location: `/session/${encodeURIComponent(filename)}` },
  });
}
