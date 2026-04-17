import { test, expect } from "bun:test";
import bash, { name, description, parameters } from "./bash.ts";

const ctx = { cwd: ".", home: "/tmp", env: { ...process.env, TERM: "dumb" } } as any;

test("metadata", () => {
  expect(name).toBe("bash");
  expect(description).toContain("bash");
  expect(parameters.required).toContain("command");
});

test("executes simple command", async () => {
  const r = await bash(ctx, {}, { command: "echo hello" });
  expect(r.content[0].text).toContain("hello");
});

test("returns exit code for failing command", async () => {
  const r = await bash(ctx, {}, { command: "false" });
  expect(r.content[0].text).toContain("Exit code");
});
