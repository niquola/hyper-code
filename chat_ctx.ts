import { agent_createCtx } from "./agent_createCtx.ts";
import { agent_buildSystemPrompt } from "./agent_buildSystemPrompt.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import { chat_loadSettings, chat_resolveModel, chat_resolveApiKey } from "./chat_settings.ts";
import { chat_sessionLatest, chat_sessionCreate, chat_sessionLoad, chat_sessionAppend } from "./chat_session.ts";
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
      tool_html_dialog(() => {
        const fn = currentFilename;
        return fn ? sessions.get(fn)! : null!;
      }),
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

  const messages = await chat_sessionLoad(filename);
  const session: Session = {
    filename,
    messages,
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
