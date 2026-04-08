import type { Model } from "./ai_type_Model.ts";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";

export function agent_createCtx(opts: {
  model: Model;
  apiKey: string;
  systemPrompt?: string;
  tools?: AgentTool[];
}): Ctx {
  return {
    model: opts.model,
    apiKey: opts.apiKey,
    systemPrompt: opts.systemPrompt ?? "",
    messages: [],
    tools: opts.tools ?? [],
    abortController: null,
    isStreaming: false,
  };
}
