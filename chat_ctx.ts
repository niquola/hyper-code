import { agent_createCtx } from "./agent_createCtx.ts";
import { agent_buildSystemPrompt } from "./agent_buildSystemPrompt.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
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

let ctx: Ctx | null = null;
let sessionFile: string | null = null;

export async function chat_getCtx(): Promise<Ctx> {
  if (!ctx) {
    const cwd = process.cwd();
    const settings = await chat_loadSettings();
    const model = chat_resolveModel(settings);
    const apiKey = chat_resolveApiKey(settings);

    const tools = [
      tool_read(cwd),
      tool_write(cwd),
      tool_edit(cwd),
      tool_bash(cwd),
      tool_grep(cwd),
      tool_find(cwd),
      tool_ls(cwd),
      tool_hyper_ui(cwd),
    ];

    // Load latest session or create new
    sessionFile = chat_sessionLatest() || chat_sessionCreate();
    const messages = await chat_sessionLoad(sessionFile);

    ctx = agent_createCtx({
      model,
      apiKey,
      systemPrompt: agent_buildSystemPrompt(cwd, tools),
      tools,
    });
    ctx.messages = messages;
  }
  return ctx;
}

/** Append new messages to session file. Call after agent_end. */
export function chat_saveMessages(...msgs: Message[]): void {
  if (sessionFile && msgs.length > 0) {
    chat_sessionAppend(sessionFile, ...msgs);
  }
}

export function chat_getSessionFile(): string | null {
  return sessionFile;
}

export function chat_resetCtx(): void {
  ctx = null;
  sessionFile = null;
}
