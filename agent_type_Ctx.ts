import type { Message } from "./ai_type_Message.ts";
import type { Model } from "./ai_type_Model.ts";
import type { AgentTool } from "./agent_type_Tool.ts";

export type Ctx = {
  model: Model;
  apiKey: string;
  systemPrompt: string;
  messages: Message[];
  tools: AgentTool[];
  abortController: AbortController | null;
  isStreaming: boolean;
};
