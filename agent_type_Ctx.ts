import type { Model } from "./ai_type_Model.ts";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { chat_db } from "./chat_db.ts";

export type Ctx = {
  model: Model;
  apiKey: string;
  systemPrompt: string;
  tools: AgentTool[];
  db: ReturnType<typeof chat_db>;
  cwd: string;
};
