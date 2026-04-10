import { test, expect, describe } from "bun:test";
import { chat_createSSEStream } from "./chat_sse.ts";
import type { AgentEvent } from "./agent_type_Event.ts";
import type { Session } from "./chat_type_Session.ts";

function mockSession(): Session {
  return { session_id: "test.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, model: { id: "test", name: "Test", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 }, apiKey: "test", systemPrompt: "", isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

async function collectSSE(response: Response): Promise<string> {
  const text = await response.text();
  return text.split("\n\n").filter(Boolean).map((chunk) => {
    return chunk.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("\n");
  }).filter(Boolean).join("");
}

describe("SSE HTML content rendering", () => {
  test("renders HTML tool results without escaping", async () => {
    const res = chat_createSSEStream(mockSession(), async (onEvent) => {
      onEvent({ type: "agent_start" });
      onEvent({
        type: "tool_execution_start",
        toolCallId: "tc1",
        toolName: "hyper_ui",
        args: { action: "show", name: "hello" },
      });
      onEvent({
        type: "tool_execution_end",
        toolCallId: "tc1",
        toolName: "hyper_ui",
        result: {
          content: [{ type: "html", html: '<div id="hyper-ui-hello"><h1>Hello Widget</h1><form><button>Click</button></form></div>' }],
        },
        isError: false,
      });
      onEvent({ type: "text_delta", delta: "Here is the widget." });
      onEvent({ type: "turn_end", message: {
        role: "assistant", content: [{ type: "text", text: "Here is the widget." }],
        provider: "t", model: "t",
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: "stop", timestamp: 1,
      }});
      onEvent({ type: "agent_end", messages: [] });
    });

    const html = await collectSSE(res);
    // HTML content should be rendered without escaping
    expect(html).toContain('<div id="hyper-ui-hello">');
    expect(html).toContain("<h1>Hello Widget</h1>");
    expect(html).toContain("<form>");
    // Should NOT have escaped HTML
    expect(html).not.toContain("&lt;h1&gt;");
  });

  test("syntax-highlighted tool output is rendered as HTML, not escaped", async () => {
    const res = chat_createSSEStream(mockSession(), async (onEvent) => {
      onEvent({ type: "agent_start" });
      onEvent({
        type: "tool_execution_start",
        toolCallId: "tc1",
        toolName: "read",
        args: { path: "foo.ts" },
      });
      onEvent({
        type: "tool_execution_end",
        toolCallId: "tc1",
        toolName: "read",
        result: {
          content: [{ type: "text", text: "1\tconst x = 1;" }],
        },
        isError: false,
      });
      onEvent({ type: "text_delta", delta: "Done." });
      onEvent({ type: "turn_end", message: {
        role: "assistant", content: [{ type: "text", text: "Done." }],
        provider: "t", model: "t",
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: "stop", timestamp: 1,
      }});
      onEvent({ type: "agent_end", messages: [] });
    });

    const html = await collectSSE(res);
    // Highlighted code should be inserted as real <pre> HTML, not escaped text
    expect(html).toContain("<pre");
    expect(html).not.toContain("&lt;pre");
  });

  test("CODEX_AUTH_EXPIRED error shows re-login button", async () => {
    const res = chat_createSSEStream(mockSession(), async (onEvent) => {
      onEvent({ type: "agent_start" });
      onEvent({ type: "error", error: "CODEX_AUTH_EXPIRED: Codex token expired. Please re-login." });
      onEvent({ type: "agent_end", messages: [] });
    });

    const html = await collectSSE(res);
    expect(html).toContain("Settings");
    expect(html).toContain("/settings");
    expect(html).not.toContain("CODEX_AUTH_EXPIRED:");
  });

  test("CODEX_AUTH_REFRESHED shows yellow notice", async () => {
    const res = chat_createSSEStream(mockSession(), async (onEvent) => {
      onEvent({ type: "agent_start" });
      onEvent({ type: "error", error: "CODEX_AUTH_REFRESHED: Token refreshed. Please retry your message." });
      onEvent({ type: "agent_end", messages: [] });
    });

    const html = await collectSSE(res);
    expect(html).toContain("Token refreshed");
    expect(html).toContain("bg-yellow-50");
    expect(html).not.toContain("CODEX_AUTH_REFRESHED:");
  });

  test("regular error renders without re-login button", async () => {
    const res = chat_createSSEStream(mockSession(), async (onEvent) => {
      onEvent({ type: "agent_start" });
      onEvent({ type: "error", error: "Something went wrong" });
      onEvent({ type: "agent_end", messages: [] });
    });

    const html = await collectSSE(res);
    expect(html).toContain("Something went wrong");
    expect(html).not.toContain("Re-login");
  });
});
