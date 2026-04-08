import type { AssistantMessage, Message, ToolCall } from "./ai_type_Message.ts";
import type { AssistantMessageEvent } from "./ai_type_Event.ts";
import type { AgentToolResult } from "./agent_type_Tool.ts";

export type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end"; messages: Message[] }
  | { type: "turn_start" }
  | { type: "turn_end"; message: AssistantMessage }
  | { type: "text_delta"; delta: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "tool_execution_start"; toolCallId: string; toolName: string; args: any }
  | { type: "tool_execution_end"; toolCallId: string; toolName: string; result: AgentToolResult; isError: boolean }
  | { type: "error"; error: string };
