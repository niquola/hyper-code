import type { Model } from "../ai/type_Model.ts";
import type chat_db from "./db.ts";

export default async function chat_resolveSessionModel(ctx: any, home: string, cwd: string, db: ReturnType<typeof chat_db>, sessionId: string): Promise<{ model: Model; apiKey: string }> {
  const session = db.getSession(sessionId);
  const modelStr = session?.model || null;
  const settings = await ctx.chat.loadSettings();

  if (modelStr && modelStr.includes("/")) {
    const [provider, modelId] = modelStr.split("/");
    const model = await ctx.chat.resolveModel(cwd, { ...settings, provider: provider!, modelId: modelId! });
    const apiKey = await ctx.chat.getApiKey(home, provider!);
    return { model, apiKey };
  }

  const model = await ctx.chat.resolveModel(cwd, settings);
  const apiKey = await ctx.chat.getApiKey(home, settings.provider);
  return { model, apiKey };
}
