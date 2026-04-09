import { test, expect, describe } from "bun:test";
import { agent_executeTools } from "./agent_executeTools.ts";
import { agent_createCtx } from "./agent_createCtx.ts";
import type { AgentEvent } from "./agent_type_Event.ts";
import type { ToolCall } from "./ai_type_Message.ts";
import type { Model } from "./ai_type_Model.ts";
import type { Session } from "./chat_type_Session.ts";

function createSession(): Session {
  return { session_id: "test.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, model: { id: "test", name: "Test", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 }, apiKey: "test", systemPrompt: "", isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

const model: Model = {
  id: "test", name: "Test", provider: "test", baseUrl: "",
  reasoning: false, input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000, maxTokens: 32000,
};

describe("agent_executeTools edge cases", () => {
  test("handles empty tool calls array", async () => {
    const ctx = agent_createCtx({ model, apiKey: "test" });
    const events: AgentEvent[] = [];
    const results = await agent_executeTools(ctx, createSession(), [], (e) => events.push(e));
    expect(results).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  test("handles mixed success and failure", async () => {
    const ctx = agent_createCtx({
      model, apiKey: "test",
      tools: [
        { name: "ok", description: "works", parameters: {}, execute: async (_c: any, _s: any) => ({ content: [{ type: "text" as const, text: "ok" }] }) },
        { name: "fail", description: "fails", parameters: {}, execute: async (_c: any, _s: any) => { throw new Error("nope"); } },
      ],
    });

    const toolCalls: ToolCall[] = [
      { type: "toolCall", id: "tc1", name: "ok", arguments: {} },
      { type: "toolCall", id: "tc2", name: "fail", arguments: {} },
      { type: "toolCall", id: "tc3", name: "ok", arguments: {} },
    ];

    const results = await agent_executeTools(ctx, createSession(), toolCalls,() => {});
    expect(results).toHaveLength(3);
    expect(results[0]!.isError).toBe(false);
    expect(results[1]!.isError).toBe(true);
    expect(results[2]!.isError).toBe(false);
  });

  test("respects abort signal", async () => {
    const ctx = agent_createCtx({
      model, apiKey: "test",
      tools: [{
        name: "slow",
        description: "slow",
        parameters: {},
        execute: async (_c: any, _s: any, _params: any, signal: any) => {
          await Bun.sleep(100);
          if (signal?.aborted) throw new Error("aborted");
          return { content: [{ type: "text" as const, text: "done" }] };
        },
      }],
    });

    const ac = new AbortController();
    setTimeout(() => ac.abort(), 20);

    const results = await agent_executeTools(
      ctx,
      createSession(),
      [{ type: "toolCall", id: "tc1", name: "slow", arguments: {} }],
      () => {},
      ac.signal,
    );
    expect(results[0]!.isError).toBe(true);
    expect((results[0]!.content[0] as any).text).toContain("aborted");
  });

  test("emits start and end events for each tool", async () => {
    const ctx = agent_createCtx({
      model, apiKey: "test",
      tools: [{ name: "x", description: "x", parameters: {}, execute: async (_c: any, _s: any) => ({ content: [{ type: "text" as const, text: "r" }] }) }],
    });

    const events: AgentEvent[] = [];
    await agent_executeTools(ctx, createSession(), [
      { type: "toolCall", id: "tc1", name: "x", arguments: { a: 1 } },
      { type: "toolCall", id: "tc2", name: "x", arguments: { a: 2 } },
    ], (e) => events.push(e));

    const starts = events.filter((e) => e.type === "tool_execution_start");
    const ends = events.filter((e) => e.type === "tool_execution_end");
    expect(starts).toHaveLength(2);
    expect(ends).toHaveLength(2);
    expect((starts[0] as any).toolCallId).toBe("tc1");
    expect((starts[1] as any).toolCallId).toBe("tc2");
  });
});
