import { agent_createCtx } from "./agent_createCtx.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Model } from "./ai_type_Model.ts";
import { tool_read } from "./tool_read.ts";
import { tool_write } from "./tool_write.ts";
import { tool_edit } from "./tool_edit.ts";
import { tool_bash } from "./tool_bash.ts";

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
    ctx = agent_createCtx({
      model: MODEL,
      apiKey: "lm-studio",
      systemPrompt: `You are a coding assistant. You have tools to read, write, edit files and run bash commands. Working directory: ${cwd}`,
      tools: [tool_read(cwd), tool_write(cwd), tool_edit(cwd), tool_bash(cwd)],
    });
  }
  return ctx;
}
