import type { Ctx } from "../agent/type_Ctx.ts";

export default async function (ctx: Ctx, req: Request) {
  const form = await req.formData();
  const provider = (form.get("provider") as string)?.trim();
  const apiKey = (form.get("apiKey") as string)?.trim();

  if (provider && apiKey) {
    await ctx.chat.saveApiKey(ctx.home, provider, apiKey);
  }

  return new Response(null, { status: 302, headers: { Location: "/settings" } });
}
