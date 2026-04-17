import { test, expect } from "bun:test";
import { ai_convertTools } from "./convertTools.ts";

test("converts tools to OpenAI format", () => {
  const result = ai_convertTools([
    { name: "read", description: "Read file", parameters: { type: "object", properties: { path: { type: "string" } } } },
  ]);
  expect(result).toHaveLength(1);
  expect(result[0]!.type).toBe("function");
  const fn = (result[0] as { type: "function"; function: { name: string; strict: boolean } }).function;
  expect(fn.name).toBe("read");
  expect(fn.strict).toBe(false);
});

test("handles empty tools", () => {
  expect(ai_convertTools([])).toEqual([]);
});
