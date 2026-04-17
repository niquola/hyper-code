import type { Ctx } from "../agent/type_Ctx.ts";

export default async function (ctx: Ctx, req: Request) {
  const form = await req.formData();
  const title = (form.get("title") as string)?.trim();
  const provider = (form.get("provider") as string)?.trim();
  const modelId = (form.get("modelId") as string)?.trim();

  const db = ctx.db;
  const settings = await ctx.chat.loadSettings();
  const model = provider && modelId ? `${provider}/${modelId}` : `${settings.provider}/${settings.modelId}`;

  const filename = db.createSession({ title: title || undefined, model });

  return new Response(null, {
    status: 302,
    headers: { Location: `/session/${encodeURIComponent(filename)}/` },
  });
}
