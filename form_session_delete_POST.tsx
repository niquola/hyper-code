import type { Ctx } from "./agent_type_Ctx.ts";

export default async function (ctx: Ctx, req: Request) {
  const form = await req.formData();
  const filename = form.get("filename") as string;
  if (!filename) return new Response(null, { status: 302, headers: { Location: "/" } });

  ctx.db.deleteSession(filename);
  return new Response(null, { status: 302, headers: { Location: "/" } });
}
