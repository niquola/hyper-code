import type { Ctx } from "../agent/type_Ctx.ts";

export default async function (ctx: Ctx, req: Request) {
  const form = await req.formData();
  const filename = form.get("filename") as string;
  const title = form.get("title") as string;
  if (!filename || !title?.trim()) {
    return new Response(null, { status: 302, headers: { Location: "/" } });
  }

  ctx.db.setSessionTitle(filename, title.trim());
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
