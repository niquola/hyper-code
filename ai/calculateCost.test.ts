import { test, expect } from "bun:test";
import { ai_calculateCost } from "./calculateCost.ts";
import type { Model } from "./type_Model.ts";
import type { Usage } from "./type_Message.ts";

const M: Model = { id: "t", name: "T", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 };

function usage(input: number, output: number): Usage {
  return { input, output, cacheRead: 0, cacheWrite: 0, totalTokens: input + output, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
}

test("calculates cost correctly", () => {
  const u = usage(1000, 500);
  ai_calculateCost(M, u);
  expect(u.cost.input).toBeCloseTo(0.003);
  expect(u.cost.output).toBeCloseTo(0.0075);
  expect(u.cost.total).toBeCloseTo(0.0105);
});

test("zero tokens = zero cost", () => {
  const u = usage(0, 0);
  ai_calculateCost(M, u);
  expect(u.cost.total).toBe(0);
});
