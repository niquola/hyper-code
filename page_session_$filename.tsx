import { layout_view_page } from "./layout_view_page.tsx";
import { chat_view_page } from "./chat_view_page.tsx";
import { chat_getCtx, chat_switchSession, chat_getSession } from "./chat_ctx.ts";
import { chat_markRead } from "./chat_unread.ts";

export default async function (req: Request, params: { filename: string }) {
  const filename = decodeURIComponent(params.filename);
  const currentSession = await chat_getSession();

  if (currentSession.filename !== filename) {
    await chat_switchSession(filename);
  }

  const ctx = await chat_getCtx();
  const session = await chat_getSession();
  chat_markRead(session.filename, session.messages.length);
  const body = await chat_view_page(session.messages, session.filename, session.isStreaming);
  return layout_view_page("Hyper Code", body, ctx.model.name || ctx.model.id);
}
