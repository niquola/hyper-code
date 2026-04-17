import type { Model } from "./ai_type_Model.ts";
import type { ModelIndex } from "./ai_type_ModelIndex.ts";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { chat_db } from "./chat_db.ts";

export type Env = Record<string, string | undefined>;

export type Ctx = {
  model: Model;
  apiKey: string;
  systemPrompt: string;
  tools: AgentTool[];
  db: ReturnType<typeof chat_db>;
  cwd: string;
  home: string;
  env: Env;
  modelIndex: ModelIndex;
  modelProviders: Map<string, Record<string, Model>>;
  modelAll: Record<string, Model> | null;
};
