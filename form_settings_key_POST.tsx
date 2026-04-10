import type { Ctx } from "./agent_type_Ctx.ts";
import { chat_saveApiKey } from "./chat_apiKeys.ts";

export default async function (ctx: Ctx, req: Request) {
  const form = await req.formData();
  const provider = (form.get("provider") as string)?.trim();
  const apiKey = (form.get("apiKey") as string)?.trim();

  if (provider && apiKey) {
    await chat_saveApiKey(ctx.home, provider, apiKey);
  }

  return new Response(null, { status: 302, headers: { Location: "/settings" } });
}
