// Chat session management — initialize with ctx, manage session cache
import type { Ctx } from "../agent/type_Ctx.ts";
import type { Session } from "./type_Session.ts";
import type { Message } from "../ai/type_Message.ts";
import agent_buildSystemPrompt from "../agent/buildSystemPrompt.ts";
import chat_resolveSessionModel from "./resolveSessionModel.ts";
import chat_loadMessages from "./loadMessages.ts";

// Session cache — runtime state (queues, streaming, listeners)
const sessions = new Map<string, Session>();
const messageCache = new Map<string, Message[]>();

let _ctx: Ctx | null = null;

export default function chat_start(ctx: Ctx) {
  _ctx = ctx;
  sessions.clear();
  messageCache.clear();
}

export function chat_loadSessionByName(filename: string): Promise<Session> {
  return loadSession(filename);
}

async function loadSession(filename: string): Promise<Session> {
  if (!_ctx) throw new Error("chat not started — call chat_start(ctx) first");
  const ctx = _ctx;

  const cached = sessions.get(filename);
  if (cached) return cached;

  const db = ctx.db;

  const messages = chat_loadMessages(
    filename,
    (id) => {
      const cached = sessions.get(id);
      if (cached) messageCache.set(id, cached.messages);
      const row = db.getSession(id);
      return row ? { parent: row.parent, offset: row.offset } : null;
    },
    (id) => db.getMessages(id),
    messageCache,
  );

  const { model: sessionModel, apiKey: sessionApiKey } = await chat_resolveSessionModel(ctx.home, ctx.cwd, db, filename);
  const systemPrompt = agent_buildSystemPrompt(ctx.cwd, ctx.tools, filename, sessionModel.name || sessionModel.id);

  const session: Session = {
    session_id: filename,
    messages,
    model: sessionModel,
    apiKey: sessionApiKey,
    systemPrompt,
    steerQueue: [],
    followUpQueue: [],
    abortController: null,
    isStreaming: false,
    sseListeners: new Set(),
    pendingDialogs: new Map(),
  };
  sessions.set(filename, session);
  return session;
}

export function chat_getSession(): Promise<Session> {
  if (!_ctx) throw new Error("chat not started");
  const db = _ctx.db;
  const list = db.listSessions();
  const latest = list.find(s => db.getMessageCount(s.session_id) > 0) || list[0];
  if (latest) return loadSession(latest.session_id);
  const filename = db.createSession({});
  return loadSession(filename);
}

export function chat_findParentSession(childFilename: string): Session | null {
  for (const [, sess] of sessions) {
    if (sess.pendingDialogs.has(`subagent:${childFilename}`)) return sess;
  }
  return null;
}

export function chat_resetSessions(): void {
  sessions.clear();
  messageCache.clear();
}
