import type { Model } from "./ai_type_Model.ts";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { chat_db } from "./chat_db.ts";

export function agent_createCtx(opts: {
  model: Model;
  apiKey: string;
  systemPrompt?: string;
  tools?: AgentTool[];
  db: ReturnType<typeof chat_db>;
  cwd: string;
}): Ctx {
  return {
    model: opts.model,
    apiKey: opts.apiKey,
    systemPrompt: opts.systemPrompt ?? "",
    tools: opts.tools ?? [],
    db: opts.db,
    cwd: opts.cwd,
  };
}
