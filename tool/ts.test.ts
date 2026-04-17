import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";

test("symbols lists exports", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.ts(ctx, {}, { action: "symbols", path: "chat/db.ts" });
  expect(r.content[0].text).toContain("chat_db");
});

test("diagnostics reports", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.ts(ctx, {}, { action: "diagnostics", path: "chat/db.ts" });
  expect(r.content[0].text).toBeTruthy();
});
