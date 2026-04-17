import { test, expect, describe } from "bun:test";
import { ai_streamAnthropic } from "./ai/streamAnthropic.ts";
import type { Model } from "./ai/type_Model.ts";

const KIMI_MODEL: Model = {
  id: "k2p5",
  name: "Kimi K2P5",
  provider: "kimi-coding",
  baseUrl: "https://api.kimi.com/coding",
  reasoning: false,
  input: ["text"],
  cost: { input: 2, output: 8, cacheRead: 0.2, cacheWrite: 0 },
  contextWindow: 262144,
  maxTokens: 32768,
};

describe("ai_streamAnthropic", () => {
  test("returns AssistantMessageEventStream", () => {
    const stream = ai_streamAnthropic(KIMI_MODEL, {
      messages: [{ role: "user", content: "hi", timestamp: Date.now() }],
    }, { apiKey: "test-key" });
    expect(stream).toBeDefined();
    expect(typeof stream[Symbol.asyncIterator]).toBe("function");
  });

  test("emits error without API key", async () => {
    const stream = ai_streamAnthropic(KIMI_MODEL, {
      messages: [{ role: "user", content: "hi", timestamp: Date.now() }],
    });
    const events = [];
    for await (const e of stream) events.push(e);
    expect(events.some((e) => e.type === "error")).toBe(true);
  });

  test("handles connection error gracefully", async () => {
    const badModel = { ...KIMI_MODEL, baseUrl: "http://localhost:99999" };
    const stream = ai_streamAnthropic(badModel, {
      messages: [{ role: "user", content: "hi", timestamp: Date.now() }],
    }, { apiKey: "test" });
    const events = [];
    for await (const e of stream) events.push(e);
    expect(events.some((e) => e.type === "error")).toBe(true);
    const err = events.find((e) => e.type === "error");
    expect((err as any).error.stopReason).toBe("error");
  });
});
