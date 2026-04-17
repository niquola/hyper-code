import type { Session } from "./type_Session.ts";
import { sessions, messageCache, getCtx } from "./state.ts";

export default async function chat_loadSessionByName(filename: string): Promise<Session> {
  const ctx = getCtx();
  const cached = sessions.get(filename);
  if (cached) return cached;

  const db = ctx.db;
  const messages = ctx.chat.loadMessages(
    filename,
    (id: string) => {
      const c = sessions.get(id);
      if (c) messageCache.set(id, c.messages);
      const row = db.getSession(id);
      return row ? { parent: row.parent, offset: row.offset } : null;
    },
    (id: string) => db.getMessages(id),
    messageCache,
  );

  const { model: sessionModel, apiKey: sessionApiKey } = await ctx.chat.resolveSessionModel(ctx, ctx.home, ctx.cwd, db, filename);
  const systemPrompt = ctx.agent.buildSystemPrompt(ctx.cwd, ctx.tools, filename, sessionModel.name || sessionModel.id);

  const session: Session = {
    session_id: filename, messages, model: sessionModel, apiKey: sessionApiKey, systemPrompt,
    steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false,
    sseListeners: new Set(), pendingDialogs: new Map(),
  };
  sessions.set(filename, session);
  return session;
}
