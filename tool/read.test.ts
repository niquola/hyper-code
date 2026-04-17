import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const DIR = "/tmp/tool-read-test";

test("reads file with line numbers", async () => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/hello.txt`, "line1\nline2\nline3");
  const ctx = test_ctx({ cwd: DIR });
  const r = await ctx.tool.read(ctx, {}, { path: "hello.txt" });
  expect(r.content[0].text).toContain("1\tline1");
  expect(r.content[0].text).toContain("3\tline3");
  rmSync(DIR, { recursive: true });
});

test("supports offset and limit", async () => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/big.txt`, "a\nb\nc\nd\ne");
  const ctx = test_ctx({ cwd: DIR });
  const r = await ctx.tool.read(ctx, {}, { path: "big.txt", offset: 2, limit: 2 });
  expect(r.content[0].text).toContain("2\tb");
  expect(r.content[0].text).not.toContain("1\ta");
  rmSync(DIR, { recursive: true });
});

test("throws for missing file", async () => {
  const ctx = test_ctx({ cwd: DIR });
  try { await ctx.tool.read(ctx, {}, { path: "nope.ts" }); expect(true).toBe(false); }
  catch (e: any) { expect(e.message).toContain("File not found"); }
});
