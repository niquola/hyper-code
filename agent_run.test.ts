import { test, expect, describe } from "bun:test";
import { agent_createCtx } from "./agent/createCtx.ts";
import { agent_run } from "./agent/run.ts";
import type { AgentEvent } from "./agent_type_Event.ts";
import type { Model } from "./ai_type_Model.ts";
import type { Session } from "./chat_type_Session.ts";

const LM_MODEL: Model = {
  id: "qwen3-coder-next",
  name: "Qwen3",
  provider: "lmstudio",
  baseUrl: "http://localhost:1234/v1",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000,
};

function createSession(): Session {
  return { session_id: "test.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, model: { id: "test", name: "Test", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 }, apiKey: "test", systemPrompt: "", isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

describe("agent_run error handling", () => {
  test("handles tool that throws and continues", async () => {
    let toolCallCount = 0;
    const ctx = agent_createCtx({
      model: LM_MODEL,
      apiKey: "lm-studio",
      systemPrompt: "You have a tool called 'fail'. Call it once, then say DONE.",
      tools: [{
        name: "fail",
        description: "This tool always fails. Call it to test error handling.",
        parameters: { type: "object", properties: {} },
        execute: async (_c: any, _s: any) => { toolCallCount++; throw new Error("intentional failure"); },
      }],
    });
    const session = createSession();

    const events: AgentEvent[] = [];
    await agent_run(ctx, session, "Call the fail tool", (e) => events.push(e));

    const toolEnd = events.filter((e) => e.type === "tool_execution_end");
    if (toolEnd.length > 0) {
      expect((toolEnd[0] as any).isError).toBe(true);
    }
    expect(events[events.length - 1]!.type).toBe("agent_end");
    expect(session.isStreaming).toBe(false);
  });

  test("handles connection error gracefully", async () => {
    const ctx = agent_createCtx({
      model: { ...LM_MODEL, baseUrl: "http://localhost:99999/v1" },
      apiKey: "lm-studio",
    });
    const session = createSession();

    const events: AgentEvent[] = [];
    await agent_run(ctx, session, "hi", (e) => events.push(e));

    expect(events.some((e) => e.type === "error")).toBe(true);
    expect(session.isStreaming).toBe(false);
    expect(session.abortController).toBeNull();
  });

  test("queues follow-up when already streaming", async () => {
    const ctx = agent_createCtx({ model: LM_MODEL, apiKey: "lm-studio", db: {} as any, cwd: "." });
    const session = createSession();
    session.isStreaming = true;

    await agent_run(ctx, session, "hi", () => {});
    expect(session.followUpQueue).toContain("hi");
  });
});
