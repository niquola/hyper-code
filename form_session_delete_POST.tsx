import { chat_sessionDelete } from "./chat_session.ts";
import { chat_getSessionFile, chat_resetCtx } from "./chat_ctx.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const filename = form.get("filename") as string;
  if (!filename) return new Response(null, { status: 302, headers: { Location: "/" } });

  chat_sessionDelete(filename);

  // If deleting current session, reset ctx
  if (filename === chat_getSessionFile()) {
    chat_resetCtx();
  }

  return new Response(null, { status: 302, headers: { Location: "/" } });
}
