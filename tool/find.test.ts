import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";

test("finds ts files", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.find(ctx, {}, { pattern: "*.ts", path: "tool" });
  expect(r.content[0].text).toContain("read.ts");
  expect(r.content[0].text).toContain("bash.ts");
});
