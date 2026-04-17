import { test, expect, describe } from "bun:test";
import chat_createSSEStream from "./sse.ts";
import type { AgentEvent } from "./agent/type_Event.ts";
import type { Session } from "./chat/type_Session.ts";

function mockSession(): Session {
  return { session_id: "test.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, model: { id: "test", name: "Test", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 }, apiKey: "test", systemPrompt: "", isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

async function collectSSE(response: Response): Promise<string[]> {
  const text = await response.text();
  return text.split("\n\n").filter(Boolean).map((chunk) => {
    return chunk.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("\n");
  }).filter(Boolean);
}

describe("chat_createSSEStream", () => {
  test("returns text/event-stream response", () => {
    const res = chat_createSSEStream(mockSession(), async () => {});
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("Cache-Control")).toBe("no-cache");
  });

  test("streams agent events as SSE", async () => {
    const res = chat_createSSEStream(mockSession(), async (onEvent) => {
      onEvent({ type: "agent_start" });
      onEvent({ type: "text_delta", delta: "Hello" });
      onEvent({ type: "text_delta", delta: " world" });
      onEvent({ type: "turn_end", message: {
        role: "assistant", content: [{ type: "text", text: "Hello world" }],
        provider: "t", model: "t",
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: "stop", timestamp: 1,
      }});
      onEvent({ type: "agent_end", messages: [] });
    });

    const chunks = await collectSSE(res);
    expect(chunks.length).toBeGreaterThan(0);
    // Should contain assistant message HTML
    const allHtml = chunks.join("");
    expect(allHtml).toContain('data-status="assistant"');
  });

  test("includes tool blocks in output", async () => {
    const res = chat_createSSEStream(mockSession(), async (onEvent) => {
      onEvent({ type: "agent_start" });
      onEvent({ type: "tool_execution_start", toolCallId: "tc1", toolName: "read", args: { path: "foo.ts" } });
      onEvent({ type: "tool_execution_end", toolCallId: "tc1", toolName: "read", result: { content: [{ type: "text", text: "file data" }] }, isError: false });
      onEvent({ type: "text_delta", delta: "Done" });
      onEvent({ type: "turn_end", message: {
        role: "assistant", content: [{ type: "text", text: "Done" }],
        provider: "t", model: "t",
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: "stop", timestamp: 1,
      }});
      onEvent({ type: "agent_end", messages: [] });
    });

    const chunks = await collectSSE(res);
    const allHtml = chunks.join("");
    expect(allHtml).toContain("read");
    expect(allHtml).toContain('data-entity="tool"');
  });

  test("handles error events", async () => {
    const res = chat_createSSEStream(mockSession(), async (onEvent) => {
      onEvent({ type: "agent_start" });
      onEvent({ type: "error", error: "connection failed" });
      onEvent({ type: "agent_end", messages: [] });
    });

    const chunks = await collectSSE(res);
    const allHtml = chunks.join("");
    expect(allHtml).toContain("connection failed");
    expect(allHtml).toContain('data-status="error"');
  });

  test("handles runAgent crash gracefully", async () => {
    const res = chat_createSSEStream(mockSession(), async () => {
      throw new Error("kaboom");
    });

    const chunks = await collectSSE(res);
    const allHtml = chunks.join("");
    expect(allHtml).toContain("kaboom");
  });
});
