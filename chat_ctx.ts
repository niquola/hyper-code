import { agent_createCtx } from "./agent_createCtx.ts";
import { agent_buildSystemPrompt } from "./agent_buildSystemPrompt.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Model } from "./ai_type_Model.ts";
import { tool_read } from "./tool_read.ts";
import { tool_write } from "./tool_write.ts";
import { tool_edit } from "./tool_edit.ts";
import { tool_bash } from "./tool_bash.ts";
import { tool_grep } from "./tool_grep.ts";
import { tool_find } from "./tool_find.ts";
import { tool_ls } from "./tool_ls.ts";

const MODEL: Model = {
  id: "qwen3-coder-next",
  name: "Qwen3 Coder Next",
  provider: "lmstudio",
  baseUrl: "http://localhost:1234/v1",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000,
};

let ctx: Ctx | null = null;

export function chat_getCtx(): Ctx {
  if (!ctx) {
    const cwd = process.cwd();
    const tools = [
      tool_read(cwd),
      tool_write(cwd),
      tool_edit(cwd),
      tool_bash(cwd),
      tool_grep(cwd),
      tool_find(cwd),
      tool_ls(cwd),
    ];
    ctx = agent_createCtx({
      model: MODEL,
      apiKey: "lm-studio",
      systemPrompt: agent_buildSystemPrompt(cwd, tools),
      tools,
    });
  }
  return ctx;
}
