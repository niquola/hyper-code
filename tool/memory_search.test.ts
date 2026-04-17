import { test, expect } from "bun:test";
import test_ctx from "../test_ctx_gen.ts";

test("searches messages", async () => {
  const ctx = test_ctx();
  const sid = ctx.db.createSession({ title: "Test" });
  ctx.db.addMessage(sid, { role: "user", content: "hello world search test", timestamp: Date.now() });
  const r = await ctx.tool.memory_search(ctx, {}, { query: "hello" });
  expect(r.content[0].text).toContain("hello");
});

test("returns empty for no matches", async () => {
  const ctx = test_ctx();
  const r = await ctx.tool.memory_search(ctx, {}, { query: "ZZZNONEXISTENT" });
  expect(r.content[0].text).toContain("No messages");
});
