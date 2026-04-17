import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";

const ctx = test_ctx({ env: { ...process.env, TERM: "dumb" } });

test("executes simple command", async () => {
  const r = await ctx.tool.bash(ctx, {}, { command: "echo hello" });
  expect(r.content[0].text).toContain("hello");
});

test("returns exit code for failing command", async () => {
  const r = await ctx.tool.bash(ctx, {}, { command: "false" });
  expect(r.content[0].text).toContain("Exit code");
});
