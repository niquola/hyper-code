import type { Model } from "../ai_type_Model.ts";
import type { chat_db } from "./db.ts";
import { chat_loadSettings, chat_resolveModel } from "./settings.ts";
import { chat_getApiKey } from "./apiKeys.ts";

export async function chat_resolveSessionModel(home: string, cwd: string, db: ReturnType<typeof chat_db>, sessionId: string): Promise<{ model: Model; apiKey: string }> {
  const session = db.getSession(sessionId);
  const modelStr = session?.model || null;
  const settings = await chat_loadSettings();

  if (modelStr && modelStr.includes("/")) {
    const [provider, modelId] = modelStr.split("/");
    const model = await chat_resolveModel(cwd, { ...settings, provider: provider!, modelId: modelId! });
    const apiKey = await chat_getApiKey(home, provider!);
    return { model, apiKey };
  }

  const model = await chat_resolveModel(cwd, settings);
  const apiKey = await chat_getApiKey(home, settings.provider);
  return { model, apiKey };
}
