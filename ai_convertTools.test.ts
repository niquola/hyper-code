import { test, expect } from "bun:test";
import { ai_convertTools } from "./ai_convertTools.ts";

test("converts tools to OpenAI format", () => {
  const result = ai_convertTools([
    { name: "read", description: "Read file", parameters: { type: "object", properties: { path: { type: "string" } } } },
  ]);
  expect(result).toHaveLength(1);
  expect(result[0]!.type).toBe("function");
  expect(result[0]!.function.name).toBe("read");
  expect(result[0]!.function.strict).toBe(false);
});

test("handles empty tools", () => {
  expect(ai_convertTools([])).toEqual([]);
});
