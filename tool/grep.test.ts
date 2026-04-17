import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";

test("finds pattern in files", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.grep(ctx, {}, { pattern: "export default", path: "tool", glob: "*.ts" });
  expect(r.content[0].text).toContain("read.ts");
});

test("no matches returns message", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.grep(ctx, {}, { pattern: "xq9z8w7v6u5t4s3", path: "ai_models" });
  expect(r.content[0].text.toLowerCase()).toContain("no match");
});
