import { test, expect, describe } from "bun:test";
import ai_transformMessages from "./transformMessages.ts";
import type { AssistantMessage, Message, ToolResultMessage } from "./type_Message.ts";

const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };

function assistant(content: AssistantMessage["content"], stopReason: AssistantMessage["stopReason"] = "stop"): AssistantMessage {
  return { role: "assistant", content, provider: "t", model: "t", usage, stopReason, timestamp: 1 };
}

describe("ai_transformMessages edge cases", () => {
  test("removes redacted thinking blocks", () => {
    const msgs: Message[] = [
      assistant([{ type: "thinking", thinking: "", redacted: true }, { type: "text", text: "answer" }]),
    ];
    const result = ai_transformMessages(msgs);
    const a = result[0] as AssistantMessage;
    expect(a.content).toHaveLength(1);
    expect(a.content[0]!.type).toBe("text");
  });

  test("handles multiple orphaned tool calls", () => {
    const msgs: Message[] = [
      assistant([
        { type: "toolCall", id: "tc1", name: "read", arguments: {} },
        { type: "toolCall", id: "tc2", name: "write", arguments: {} },
      ], "toolUse"),
      { role: "user", content: "cancel", timestamp: 2 },
    ];
    const result = ai_transformMessages(msgs);
    // Should insert 2 synthetic tool results
    const toolResults = result.filter((m) => m.role === "toolResult") as ToolResultMessage[];
    expect(toolResults).toHaveLength(2);
    expect(toolResults[0]!.toolCallId).toBe("tc1");
    expect(toolResults[1]!.toolCallId).toBe("tc2");
  });

  test("does not duplicate existing tool results", () => {
    const msgs: Message[] = [
      assistant([{ type: "toolCall", id: "tc1", name: "read", arguments: {} }], "toolUse"),
      { role: "toolResult", toolCallId: "tc1", toolName: "read", content: [{ type: "text", text: "ok" }], isError: false, timestamp: 2 },
      { role: "user", content: "next", timestamp: 3 },
    ];
    const result = ai_transformMessages(msgs);
    const toolResults = result.filter((m) => m.role === "toolResult") as ToolResultMessage[];
    expect(toolResults).toHaveLength(1);
  });

  test("skips aborted assistant messages", () => {
    const msgs: Message[] = [
      { role: "user", content: "hi", timestamp: 1 },
      assistant([{ type: "text", text: "partial" }], "aborted"),
      { role: "user", content: "try again", timestamp: 3 },
    ];
    const result = ai_transformMessages(msgs);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.role === "user")).toBe(true);
  });

  test("passes through user messages unchanged", () => {
    const msgs: Message[] = [
      { role: "user", content: "hello", timestamp: 1 },
      { role: "user", content: [{ type: "text", text: "rich" }], timestamp: 2 },
    ];
    const result = ai_transformMessages(msgs);
    expect(result).toHaveLength(2);
    expect((result[0] as any).content).toBe("hello");
  });
});
