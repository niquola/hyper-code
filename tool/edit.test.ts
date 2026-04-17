import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";

const DIR = "/tmp/tool-edit-test";

test("replaces text in file", async () => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/f.ts`, "const x = 1;\nconst y = 2;");
  const ctx = test_ctx({ cwd: DIR });
  const r = await ctx.tool.edit(ctx, {}, { path: "f.ts", edits: [{ oldText: "const x = 1;", newText: "const x = 42;" }] });
  expect(r.content[0].text).toContain("Applied 1 edit");
  expect(readFileSync(`${DIR}/f.ts`, "utf-8")).toContain("const x = 42;");
  rmSync(DIR, { recursive: true });
});

test("errors on non-unique match", async () => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/dup.ts`, "aaa\naaa");
  const ctx = test_ctx({ cwd: DIR });
  const r = await ctx.tool.edit(ctx, {}, { path: "dup.ts", edits: [{ oldText: "aaa", newText: "bbb" }] });
  expect(r.content[0].text).toContain("found 2 times");
  rmSync(DIR, { recursive: true });
});
