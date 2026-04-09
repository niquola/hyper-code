import { agent_createCtx } from "./agent_createCtx.ts";
import { agent_buildSystemPrompt } from "./agent_buildSystemPrompt.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import { chat_loadSettings, chat_resolveModel, chat_resolveApiKey } from "./chat_settings.ts";
import { chat_sessionLatest, chat_sessionCreate, chat_sessionLoad, chat_sessionLoadRaw, chat_sessionAppend, chat_sessionGetOffset } from "./chat_session.ts";
import { chat_resolveSessionModel } from "./chat_resolveSessionModel.ts";
import type { Message } from "./ai_type_Message.ts";
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
import { chat_sessionGetParent } from "./chat_session.ts";

let ctx: Ctx | null = null;

// Session cache — keeps sessions alive even when switching
const sessions = new Map<string, Session>();
let currentFilename: string | null = null;

export async function chat_getCtx(): Promise<Ctx> {
  if (!ctx) {
    const cwd = process.cwd();
    const settings = await chat_loadSettings();
    const model = chat_resolveModel(settings);
    const apiKey = chat_resolveApiKey(settings);

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
  // Return cached session if exists (preserves in-memory messages from running agent)
  const cached = sessions.get(filename);
  if (cached) return cached;

  // For child sessions: use parent messages up to fork offset + own messages
  const parentFilename = await chat_sessionGetParent(filename);
  let messages: Message[];
  if (parentFilename) {
    const offset = await chat_sessionGetOffset(filename);
    let parentMessages: Message[];
    if (sessions.has(parentFilename)) {
      parentMessages = sessions.get(parentFilename)!.messages;
    } else {
      parentMessages = await chat_sessionLoad(parentFilename);
    }
    // If offset set, only include parent messages up to that point
    if (offset != null) parentMessages = parentMessages.slice(0, offset);
    const ownMessages = await chat_sessionLoadRaw(filename);
    messages = [...parentMessages, ...ownMessages];
  } else {
    messages = await chat_sessionLoad(filename);
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

export async function chat_getSession(): Promise<Session> {
  if (!currentFilename) {
    currentFilename = chat_sessionLatest() || chat_sessionCreate();
  }
  return loadSession(currentFilename);
}

export function chat_getSessionFile(): string | null {
  return currentFilename;
}

/** Switch to a specific session (cached if already loaded) */
export async function chat_switchSession(filename: string): Promise<void> {
  currentFilename = filename;
  await loadSession(filename);
}

/** Reset — new session on next request */
export function chat_resetCtx(): void {
  currentFilename = null;
}

/** Reset ctx config (e.g. after settings change) */
export function chat_resetConfig(): void {
  ctx = null;
}
