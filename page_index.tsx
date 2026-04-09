import { layout_view_page } from "./layout_view_page.tsx";
import { chat_view_page } from "./chat_view_page.tsx";
import { chat_getCtx, chat_getSession } from "./chat_ctx.ts";

export default async function (req: Request) {
  const ctx = await chat_getCtx();
  const session = await chat_getSession();
  const body = await chat_view_page(session.messages);
  return layout_view_page("Hyper Code", body, ctx.model.name || ctx.model.id);
}
