import type { Model } from "./ai_type_Model.ts";
import type { AgentTool } from "./agent_type_Tool.ts";

export type Ctx = {
  model: Model;
  apiKey: string;
  systemPrompt: string;
  tools: AgentTool[];
};
