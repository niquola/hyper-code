import { test, expect } from "bun:test";
import agent_abort from "./abort.ts";
import type { Session } from "../chat/type_Session.ts";

function s(): Session {
  return { session_id: "t.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, model: { id: "t", name: "T", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 } as any, apiKey: "test", systemPrompt: "", isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

test("does nothing without controller", () => {
  agent_abort(s()); // no throw
});

test("aborts active controller", () => {
  const session = s();
  session.abortController = new AbortController();
  agent_abort(session);
  expect(session.abortController.signal.aborted).toBe(true);
});
