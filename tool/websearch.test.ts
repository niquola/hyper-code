import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";

test("returns error without api key", async () => {
  const ctx = test_ctx({ env: {} });
  const r = await ctx.tool.websearch(ctx, {}, { query: "test" });
  expect(r.content[0].text).toContain("TAVILY_API_KEY");
});

test("requires query or url", async () => {
  const ctx = test_ctx({ env: { TAVILY_API_KEY: "fake" } });
  const r = await ctx.tool.websearch(ctx, {}, {});
  expect(r.content[0].text).toContain("query or url");
});
