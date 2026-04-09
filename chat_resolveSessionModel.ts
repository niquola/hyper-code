import type { Model } from "./ai_type_Model.ts";
import { chat_sessionGetModel } from "./chat_session.ts";
import { chat_loadSettings, chat_resolveModel, chat_resolveApiKey } from "./chat_settings.ts";

export async function chat_resolveSessionModel(filename: string): Promise<{ model: Model; apiKey: string }> {
  const modelStr = await chat_sessionGetModel(filename);
  const settings = await chat_loadSettings();

  if (modelStr && modelStr.includes("/")) {
    const [provider, modelId] = modelStr.split("/");
    const s = { ...settings, provider: provider!, modelId: modelId! };
    return { model: chat_resolveModel(s), apiKey: chat_resolveApiKey(s) };
  }

  return { model: chat_resolveModel(settings), apiKey: chat_resolveApiKey(settings) };
}
