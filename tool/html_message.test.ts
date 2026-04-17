import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";

test("returns html content", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.html_message(ctx, {}, { html: "<h1>Hi</h1>" });
  expect(r.content[0]).toEqual({ type: "html", html: "<h1>Hi</h1>" });
});
