import { agent_createCtx } from "./agent_createCtx.ts";
import { agent_buildSystemPrompt } from "./agent_buildSystemPrompt.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import type { Message } from "./ai_type_Message.ts";
import { getDb } from "./chat_db.ts";
import { chat_resolveSessionModel } from "./chat_resolveSessionModel.ts";
import { tool_read } from "./tool_read.ts";
import { tool_write } from "./tool_write.ts";
import { tool_edit } from "./tool_edit.ts";
import { tool_bash } from "./tool_bash.ts";
import { tool_grep } from "./tool_grep.ts";
import { tool_find } from "./tool_find.ts";
import { tool_ls } from "./tool_ls.ts";
import { tool_hyper_ui } from "./tool_hyper_ui.ts";
import { tool_html_message } from "./tool_html_message.ts";
import { tool_html_dialog } from "./tool_html_dialog.ts";
import { tool_subagent } from "./tool_subagent.ts";
import { tool_subagent_report } from "./tool_subagent_report.ts";
import { tool_websearch } from "./tool_websearch.ts";
import { tool_memory_search } from "./tool_memory_search.ts";

let ctx: Ctx | null = null;

// Session cache — runtime state (queues, streaming, listeners)
const sessions = new Map<string, Session>();

export async function chat_getCtx(): Promise<Ctx> {
  if (!ctx) {
    const cwd = process.cwd();
    const tools = [
      tool_read(cwd), tool_write(cwd), tool_edit(cwd), tool_bash(cwd),
      tool_grep(cwd), tool_find(cwd), tool_ls(cwd), tool_hyper_ui(cwd),
      tool_html_message(),
      tool_html_dialog(),
      tool_subagent(loadSession),
      tool_subagent_report((childFilename) => {
        for (const [, sess] of sessions) {
          if (sess.pendingDialogs.has(`subagent:${childFilename}`)) return sess;
        }
        return null;
      }),
      tool_websearch(),
      tool_memory_search(),
    ];

    const { chat_loadSettings, chat_resolveModel, chat_resolveApiKey } = await import("./chat_settings.ts");
    const settings = await chat_loadSettings();
    const model = chat_resolveModel(settings);
    const apiKey = chat_resolveApiKey(settings);

    ctx = agent_createCtx({
      model, apiKey,
      systemPrompt: agent_buildSystemPrompt(cwd, tools),
      tools,
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

  const db = getDb();

  // Load messages: for child sessions, chain parent + own with offset
  const sessionRow = db.getSession(filename);
  let messages: Message[];
  if (sessionRow?.parent) {
    // Use cached parent if available (has in-memory unsaved msgs)
    let parentMessages: Message[];
    if (sessions.has(sessionRow.parent)) {
      parentMessages = sessions.get(sessionRow.parent)!.messages;
    } else {
      parentMessages = db.getFullMessages(sessionRow.parent).map(rowToMessage);
    }
    if (sessionRow.offset != null) parentMessages = parentMessages.slice(0, sessionRow.offset);
    const ownMessages = db.getMessages(filename).map(rowToMessage);
    messages = [...parentMessages, ...ownMessages];
  } else {
    messages = db.getMessages(filename).map(rowToMessage);
  }

  // Resolve model per session
  const { model: sessionModel, apiKey: sessionApiKey } = await chat_resolveSessionModel(filename);
  const sessionCtx = await chat_getCtx();
  const systemPrompt = agent_buildSystemPrompt(process.cwd(), sessionCtx.tools, filename, sessionModel.name || sessionModel.id);

  const session: Session = {
    filename,
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

function rowToMessage(row: { role: string; content: string; timestamp: number }): Message {
  // Messages stored as JSON content for assistant/toolResult, plain text for user
  if (row.role === "user") {
    return { role: "user", content: row.content, timestamp: row.timestamp };
  }
  try {
    return JSON.parse(row.content);
  } catch {
    return { role: "user", content: row.content, timestamp: row.timestamp };
  }
}

export async function chat_getSession(): Promise<Session> {
  const db = getDb();
  const list = db.listSessions();
  const latest = list.find(s => db.getMessageCount(s.filename) > 0) || list[0];
  if (latest) return loadSession(latest.filename);
  // No sessions — create one
  const filename = db.createSession({});
  return loadSession(filename);
}

export function chat_getSessionFile(): string | null {
  return null; // deprecated — use URL
}

export function chat_resetCtx(): void {
  // noop — sessions in SQLite
}

export function chat_resetConfig(): void {
  ctx = null;
}
