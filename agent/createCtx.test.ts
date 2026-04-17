import { test, expect } from "bun:test";
import { agent_createCtx } from "./createCtx.ts";
import type { Model } from "../ai/type_Model.ts";

const M: Model = { id: "t", name: "T", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 };

test("creates ctx with defaults", () => {
  const ctx = agent_createCtx({ model: M, apiKey: "k" , db: {} as any, cwd: "."});
  expect(ctx.model).toBe(M);
  expect(ctx.apiKey).toBe("k");
  expect(ctx.systemPrompt).toBe("");
  expect(ctx.tools).toEqual([]);
  expect(ctx.modelIndex.providers).toEqual([]);
  expect(ctx.modelProviders.size).toBe(0);
  expect(ctx.modelAll).toBeNull();
});

test("creates ctx with custom values", () => {
  const ctx = agent_createCtx({ model: M, apiKey: "k", systemPrompt: "Be helpful", tools: [{ name: "x", description: "x", parameters: {}, execute: async () => ({ content: [] , db: {} as any, cwd: "."}) }] });
  expect(ctx.systemPrompt).toBe("Be helpful");
  expect(ctx.tools).toHaveLength(1);
});
