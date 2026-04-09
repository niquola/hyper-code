import { test, expect, describe } from "bun:test";
import { agent_reset } from "./agent_reset.ts";
import type { Session } from "./chat_type_Session.ts";

function createSession(): Session {
  return { filename: "test.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

describe("agent_reset", () => {
  test("clears messages", () => {
    const session = createSession();
    session.messages.push({ role: "user", content: "hi", timestamp: 1 });
    session.messages.push({
      role: "assistant", content: [{ type: "text", text: "hello" }],
      provider: "test", model: "test",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: "stop", timestamp: 2,
    });
    expect(session.messages).toHaveLength(2);
    agent_reset(session);
    expect(session.messages).toHaveLength(0);
  });

  test("aborts active run", () => {
    const session = createSession();
    session.abortController = new AbortController();
    session.isStreaming = true;
    agent_reset(session);
    expect(session.isStreaming).toBe(false);
    expect(session.abortController).toBeNull();
  });
});
