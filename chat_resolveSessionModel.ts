import type { Model } from "./ai_type_Model.ts";
import type { chat_db } from "./chat_db.ts";
import { chat_loadSettings, chat_resolveModel } from "./chat_settings.ts";
import { chat_getApiKey } from "./chat_apiKeys.ts";

export async function chat_resolveSessionModel(cwd: string, db: ReturnType<typeof chat_db>, sessionId: string): Promise<{ model: Model; apiKey: string }> {
  const session = db.getSession(sessionId);
  const modelStr = session?.model || null;
  const settings = await chat_loadSettings();

  if (modelStr && modelStr.includes("/")) {
    const [provider, modelId] = modelStr.split("/");
    const model = await chat_resolveModel(cwd, { ...settings, provider: provider!, modelId: modelId! });
    const apiKey = await chat_getApiKey(provider!);
    return { model, apiKey };
  }

  const model = await chat_resolveModel(cwd, settings);
  const apiKey = await chat_getApiKey(settings.provider);
  return { model, apiKey };
}
