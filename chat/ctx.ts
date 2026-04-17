import { agent_createCtx } from "../agent/createCtx.ts";
import { agent_buildSystemPrompt } from "../agent/buildSystemPrompt.ts";
import type { Ctx } from "../agent/type_Ctx.ts";
import type { Session } from "../chat/type_Session.ts";
import type { Message } from "../ai/type_Message.ts";
import { chat_db } from "./db.ts";
import { chat_resolveSessionModel } from "./resolveSessionModel.ts";
import { ai_models_loadIndex } from "../ai/models_loadIndex.ts";
import { chat_loadMessages } from "./loadMessages.ts";
import { loader_loadAll } from "../loader.ts";
import build_tools from "../tool/build_tools.ts";

let ctx: Ctx | null = null;

// Session cache — runtime state (queues, streaming, listeners)
const sessions = new Map<string, Session>();
// Message cache — full parent chain, shared across forks
const messageCache = new Map<string, Message[]>();

export async function chat_getCtx(): Promise<Ctx> {
  if (!ctx) {
    // Read ALL env once at startup — nowhere else
    const cwd = process.cwd();
    const home = process.env.HOME || process.env.USERPROFILE || "/tmp";
    const env = { ...process.env } as Record<string, string | undefined>;

    // Load all namespaces (tool/, etc.) into a temporary ctx
    const tempCtx: any = { cwd, home, env, db: chat_db() };
    await loader_loadAll(tempCtx, cwd);

    // Build AgentTool[] from loaded tool/ namespace
    const tools = build_tools(tempCtx);

    const { chat_loadSettings, chat_resolveModel, chat_resolveApiKey } = await import("./settings.ts");
    const settings = await chat_loadSettings();
    const model = await chat_resolveModel(cwd, settings);
    const apiKey = chat_resolveApiKey(home, settings);
    const modelIndex = await ai_models_loadIndex(cwd);

    ctx = agent_createCtx({
      model, apiKey,
      systemPrompt: agent_buildSystemPrompt(cwd, tools),
      tools,
      db: tempCtx.db,
      cwd, home, env,
      modelIndex,
    });
  }
  return ctx;
}

export async function chat_loadSessionByName(filename: string): Promise<Session> {
  return loadSession(filename);
}

async function loadSession(filename: string): Promise<Session> {
  const cached = sessions.get(filename);
  if (cached) return cached;

  const db = ctx!.db;

  // Load full message chain (parent → child), with caching
  const messages = chat_loadMessages(
    filename,
    (id) => {
      // Use in-memory session messages if loaded (has unsaved msgs from current run)
      const cached = sessions.get(id);
      if (cached) {
        messageCache.set(id, cached.messages);
      }
      const row = db.getSession(id);
      return row ? { parent: row.parent, offset: row.offset } : null;
    },
    (id) => db.getMessages(id),
    messageCache,
  );

  // Resolve model per session
  const { model: sessionModel, apiKey: sessionApiKey } = await chat_resolveSessionModel(ctx!.home, ctx!.cwd, db, filename);
  const sessionCtx = await chat_getCtx();
  const systemPrompt = agent_buildSystemPrompt(ctx!.cwd, sessionCtx.tools, filename, sessionModel.name || sessionModel.id);

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


export async function chat_getSession(): Promise<Session> {
  const db = ctx!.db;
  const list = db.listSessions();
  const latest = list.find(s => db.getMessageCount(s.session_id) > 0) || list[0];
  if (latest) return loadSession(latest.session_id);
  // No sessions — create one
  const filename = db.createSession({});
  return loadSession(filename);
}

export function chat_getSessionFile(): string | null {
  return null; // deprecated — use URL
}

export function chat_findParentSession(childFilename: string): Session | null {
  for (const [, sess] of sessions) {
    if (sess.pendingDialogs.has(`subagent:${childFilename}`)) return sess;
  }
  return null;
}

export function chat_resetCtx(): void {
  sessions.clear();
  messageCache.clear();
}

export function chat_resetConfig(): void {
  ctx = null;
  sessions.clear();
  messageCache.clear();
}
