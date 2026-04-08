import type { AssistantMessage, Message, ToolCall, ToolResultMessage } from "./ai_type_Message.ts";

export function ai_transformMessages(messages: Message[]): Message[] {
  const toolCallIdMap = new Map<string, string>();

  const transformed = messages.map((msg) => {
    if (msg.role === "user") return msg;

    if (msg.role === "toolResult") {
      const normalizedId = toolCallIdMap.get(msg.toolCallId);
      if (normalizedId && normalizedId !== msg.toolCallId) {
        return { ...msg, toolCallId: normalizedId };
      }
      return msg;
    }

    if (msg.role === "assistant") {
      const transformedContent = msg.content.flatMap((block) => {
        if (block.type === "thinking") {
          if (block.redacted) return [];
          if (!block.thinking || block.thinking.trim() === "") return [];
          return block;
        }
        return block;
      });
      return { ...msg, content: transformedContent };
    }

    return msg;
  });

  // Insert synthetic empty tool results for orphaned tool calls
  const result: Message[] = [];
  let pendingToolCalls: ToolCall[] = [];
  let existingToolResultIds = new Set<string>();

  for (const msg of transformed) {
    if (msg.role === "assistant") {
      if (pendingToolCalls.length > 0) {
        for (const tc of pendingToolCalls) {
          if (!existingToolResultIds.has(tc.id)) {
            result.push({
              role: "toolResult",
              toolCallId: tc.id,
              toolName: tc.name,
              content: [{ type: "text", text: "No result provided" }],
              isError: true,
              timestamp: Date.now(),
            } as ToolResultMessage);
          }
        }
        pendingToolCalls = [];
        existingToolResultIds = new Set();
      }

      // Skip errored/aborted assistant messages
      const assistantMsg = msg as AssistantMessage;
      if (assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted") {
        continue;
      }

      const toolCalls = assistantMsg.content.filter((b) => b.type === "toolCall") as ToolCall[];
      if (toolCalls.length > 0) {
        pendingToolCalls = toolCalls;
        existingToolResultIds = new Set();
      }
      result.push(msg);
    } else if (msg.role === "toolResult") {
      existingToolResultIds.add(msg.toolCallId);
      result.push(msg);
    } else if (msg.role === "user") {
      if (pendingToolCalls.length > 0) {
        for (const tc of pendingToolCalls) {
          if (!existingToolResultIds.has(tc.id)) {
            result.push({
              role: "toolResult",
              toolCallId: tc.id,
              toolName: tc.name,
              content: [{ type: "text", text: "No result provided" }],
              isError: true,
              timestamp: Date.now(),
            } as ToolResultMessage);
          }
        }
        pendingToolCalls = [];
        existingToolResultIds = new Set();
      }
      result.push(msg);
    } else {
      result.push(msg);
    }
  }

  return result;
}
