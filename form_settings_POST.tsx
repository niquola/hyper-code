import type { Ctx } from "./agent/type_Ctx.ts";
import { chat_loadSettings, chat_saveSettings } from "./chat/settings.ts";

export default async function (ctx: Ctx, req: Request) {
  const form = await req.formData();
  const provider = form.get("provider") as string;
  const modelId = form.get("modelId") as string;
  const apiKey = form.get("apiKey") as string;

  const current = await chat_loadSettings();

  // If only provider changed (auto-submit on select), redirect to settings with new provider
  if (provider && !modelId) {
    return new Response(null, { status: 302, headers: { Location: `/settings?provider=${provider}` } });
  }

  await chat_saveSettings({
    provider: provider || current.provider,
    modelId: modelId || current.modelId,
    apiKey: apiKey || current.apiKey, // keep old key if empty
  });

  // Reset agent config + session so it picks up new settings
  const { chat_resetCtx, chat_resetConfig } = await import("./chat_ctx.ts");
  chat_resetConfig();
  chat_resetCtx();

  return new Response(null, { status: 302, headers: { Location: "/" } });
}
