import { test, expect, describe } from "bun:test";
import { agent_reset } from "./agent_reset.ts";
import { agent_createCtx } from "./agent_createCtx.ts";
import type { Model } from "./ai_type_Model.ts";

const model: Model = {
  id: "test", name: "Test", provider: "test", baseUrl: "http://localhost:1234/v1",
  reasoning: false, input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000, maxTokens: 32000,
};

describe("agent_reset", () => {
  test("clears messages", () => {
    const ctx = agent_createCtx({ model, apiKey: "test" });
    ctx.messages.push({ role: "user", content: "hi", timestamp: 1 });
    ctx.messages.push({
      role: "assistant", content: [{ type: "text", text: "hello" }],
      provider: "test", model: "test",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: "stop", timestamp: 2,
    });
    expect(ctx.messages).toHaveLength(2);
    agent_reset(ctx);
    expect(ctx.messages).toHaveLength(0);
  });

  test("aborts active run", () => {
    const ctx = agent_createCtx({ model, apiKey: "test" });
    ctx.abortController = new AbortController();
    ctx.isStreaming = true;
    agent_reset(ctx);
    expect(ctx.isStreaming).toBe(false);
    expect(ctx.abortController).toBeNull();
  });
});
