import type { TextContent, ImageContent, HtmlContent } from "./ai_type_Message.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";

export type AgentToolResult = {
  content: (TextContent | ImageContent | HtmlContent)[];
};

export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (ctx: Ctx, session: Session, params: any, signal?: AbortSignal) => Promise<AgentToolResult>;
};
