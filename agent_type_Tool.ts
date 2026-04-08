import type { TextContent, ImageContent, HtmlContent } from "./ai_type_Message.ts";

export type AgentToolResult = {
  content: (TextContent | ImageContent | HtmlContent)[];
};

export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: any, signal?: AbortSignal) => Promise<AgentToolResult>;
};
