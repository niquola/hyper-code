import { chat_sessionCreate, chat_sessionSetTitle, chat_sessionSetModel } from "./chat_session.ts";
import { chat_loadSettings } from "./chat_settings.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const title = (form.get("title") as string)?.trim();
  const provider = (form.get("provider") as string)?.trim();
  const modelId = (form.get("modelId") as string)?.trim();

  const filename = chat_sessionCreate();
  if (title) await chat_sessionSetTitle(filename, title);

  // Set model — from form or current settings
  if (provider && modelId) {
    await chat_sessionSetModel(filename, `${provider}/${modelId}`);
  } else {
    const settings = await chat_loadSettings();
    await chat_sessionSetModel(filename, `${settings.provider}/${settings.modelId}`);
  }

  return new Response(null, {
    status: 302,
    headers: { Location: `/session/${encodeURIComponent(filename)}/` },
  });
}
