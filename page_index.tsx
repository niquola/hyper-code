import { layout_view_page } from "./layout_view_page.tsx";
import { chat_view_page } from "./chat_view_page.tsx";
import { chat_getCtx } from "./chat_ctx.ts";

export default async function (req: Request) {
  const ctx = await chat_getCtx();
  const body = await chat_view_page(ctx.messages);
  return layout_view_page("Hyper Code", body);
}
