import { chat_sessionCreate, chat_sessionSetTitle } from "./chat_session.ts";
import { chat_switchSession } from "./chat_ctx.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const title = (form.get("title") as string)?.trim();
  // provider/modelId stored for future per-session model support
  // const provider = form.get("provider") as string;
  // const modelId = form.get("modelId") as string;

  const filename = chat_sessionCreate();

  if (title) {
    await chat_sessionSetTitle(filename, title);
  }

  await chat_switchSession(filename);
  return new Response(null, {
    status: 302,
    headers: { Location: `/session/${encodeURIComponent(filename)}/` },
  });
}
