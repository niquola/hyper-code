import type { TextContent, ImageContent } from "./ai_type_Message.ts";

export type AgentToolResult = {
  content: (TextContent | ImageContent)[];
};

export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: any, signal?: AbortSignal) => Promise<AgentToolResult>;
};
