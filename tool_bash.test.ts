import { test, expect } from "bun:test";
import { tool_bash } from "./tool_bash.ts";

const t = tool_bash(".");

test("executes simple command", async () => {
  const result = await t.execute({} as any, {} as any, { command: "echo hello" });
  const text = result.content.find((c) => c.type === "text")?.text || "";
  expect(text).toContain("hello");
});

test("returns error for failing command", async () => {
  const result = await t.execute({} as any, {} as any, { command: "false" });
  const text = result.content.find((c) => c.type === "text")?.text || "";
  expect(text.toLowerCase()).toContain("exit code");
});

test("has correct tool metadata", () => {
  expect(t.name).toBe("bash");
  expect(t.description).toBeTruthy();
  expect(t.parameters).toBeTruthy();
});
