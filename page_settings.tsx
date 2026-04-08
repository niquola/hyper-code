import { layout_view_page } from "./layout_view_page.tsx";
import { chat_view_settings } from "./chat_view_settings.tsx";
import { chat_loadSettings } from "./chat_settings.ts";

export default async function (req: Request) {
  const settings = await chat_loadSettings();

  // If provider is passed as query param (from provider select change), use it
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") || settings.provider;

  const body = chat_view_settings({
    provider,
    modelId: settings.modelId,
    apiKey: settings.apiKey,
  });
  return layout_view_page("Settings — Hyper Code", body);
}
