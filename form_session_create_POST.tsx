import { getDb } from "./chat_db.ts";
import { chat_loadSettings } from "./chat_settings.ts";

export default async function (req: Request) {
  const form = await req.formData();
  const title = (form.get("title") as string)?.trim();
  const provider = (form.get("provider") as string)?.trim();
  const modelId = (form.get("modelId") as string)?.trim();

  const db = getDb();
  const settings = await chat_loadSettings();
  const model = provider && modelId ? `${provider}/${modelId}` : `${settings.provider}/${settings.modelId}`;

  const filename = db.createSession({ title: title || undefined, model });

  return new Response(null, {
    status: 302,
    headers: { Location: `/session/${encodeURIComponent(filename)}/` },
  });
}
