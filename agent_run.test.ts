import { test, expect, describe } from "bun:test";
import { agent_createCtx } from "./agent_createCtx.ts";
import { agent_run } from "./agent_run.ts";
import type { AgentEvent } from "./agent_type_Event.ts";
import type { Model } from "./ai_type_Model.ts";

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
        execute: async () => { toolCallCount++; throw new Error("intentional failure"); },
      }],
    });

    const events: AgentEvent[] = [];
    await agent_run(ctx, "Call the fail tool", (e) => events.push(e));

    // Should have tool_execution_end with isError=true
    const toolEnd = events.filter((e) => e.type === "tool_execution_end");
    if (toolEnd.length > 0) {
      expect((toolEnd[0] as any).isError).toBe(true);
    }
    // Agent should still complete (not crash)
    expect(events[events.length - 1]!.type).toBe("agent_end");
    expect(ctx.isStreaming).toBe(false);
  });

  test("handles connection error gracefully", async () => {
    const ctx = agent_createCtx({
      model: { ...LM_MODEL, baseUrl: "http://localhost:99999/v1" },
      apiKey: "lm-studio",
    });

    const events: AgentEvent[] = [];
    await agent_run(ctx, "hi", (e) => events.push(e));

    expect(events.some((e) => e.type === "error")).toBe(true);
    expect(ctx.isStreaming).toBe(false);
    expect(ctx.abortController).toBeNull();
  });

  test("prevents concurrent runs", async () => {
    const ctx = agent_createCtx({ model: LM_MODEL, apiKey: "lm-studio" });
    ctx.isStreaming = true;

    let threw = false;
    try {
      await agent_run(ctx, "hi", () => {});
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
