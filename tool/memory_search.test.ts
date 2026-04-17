import { test, expect } from "bun:test";
import memory_search, { name, parameters } from "./memory_search.ts";
import { chat_db } from "../chat/db.ts";

test("metadata", () => {
  expect(name).toBe("memory_search");
  expect(parameters.required).toContain("query");
});

test("searches messages", async () => {
  const db = chat_db(":memory:");
  const sid = db.createSession({ title: "Test" });
  db.addMessage(sid, { role: "user", content: "hello world search test", timestamp: Date.now() });

  const ctx = { db } as any;
  const r = await memory_search(ctx, {}, { query: "hello" });
  expect(r.content[0].text).toContain("hello");
});

test("returns empty for no matches", async () => {
  const db = chat_db(":memory:");
  const ctx = { db } as any;
  const r = await memory_search(ctx, {}, { query: "ZZZNONEXISTENT" });
  expect(r.content[0].text).toContain("No messages");
});
