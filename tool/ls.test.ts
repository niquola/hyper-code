import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";

test("lists current directory", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.ls(ctx, {}, {});
  expect(r.content[0].text).toContain("server.ts");
  expect(r.content[0].text).toContain("tool/");
});

test("lists subdirectory", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.ls(ctx, {}, { path: "tool" });
  expect(r.content[0].text).toContain("read.ts");
});
