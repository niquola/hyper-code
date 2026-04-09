import { test, expect } from "bun:test";
import { agent_abort } from "./agent_abort.ts";
import type { Session } from "./chat_type_Session.ts";

function s(): Session {
  return { filename: "t.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false, sseListeners: new Set() };
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
