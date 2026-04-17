import { test, expect, describe, beforeEach } from "bun:test";
import { chat_db } from "./chat/db.ts";

describe("memory_search (FTS5+BM25)", () => {
  let db: ReturnType<typeof chat_db>;

  beforeEach(() => {
    db = chat_db(":memory:");
  });

  test("searchMessages finds by keyword", () => {
    const s = db.createSession({ title: "OAuth work", model: "a/b" });
    db.addMessage(s, { role: "user", content: "fix the OAuth login bug", timestamp: 1 });
    db.addMessage(s, { role: "assistant", content: "I found the issue in auth_codex.ts", timestamp: 2 });
    db.addMessage(s, { role: "user", content: "now deploy it", timestamp: 3 });

    const results = db.searchMessages("OAuth");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.content).toContain("OAuth");
  });

  test("searchMessages filters by role", () => {
    const s = db.createSession({ title: "test", model: "a/b" });
    db.addMessage(s, { role: "user", content: "hello world", timestamp: 1 });
    db.addMessage(s, { role: "assistant", content: "hello back", timestamp: 2 });

    expect(db.searchMessages("hello", "user")).toHaveLength(1);
    expect(db.searchMessages("hello")).toHaveLength(2);
  });

  test("searchMessages returns session title", () => {
    const s = db.createSession({ title: "Important Chat", model: "a/b" });
    db.addMessage(s, { role: "user", content: "search this", timestamp: 1 });

    const results = db.searchMessages("search");
    expect(results[0]!.sessionTitle).toBe("Important Chat");
  });

  test("searchMessages across multiple sessions", () => {
    const s1 = db.createSession({ title: "Session A", model: "a/b" });
    const s2 = db.createSession({ title: "Session B", model: "a/b" });
    db.addMessage(s1, { role: "user", content: "refactor the router", timestamp: 1 });
    db.addMessage(s2, { role: "user", content: "router needs cleanup", timestamp: 2 });

    const results = db.searchMessages("router");
    expect(results).toHaveLength(2);
  });

  test("tool_memory_search has correct metadata", async () => {
    const { tool_memory_search } = await import("./tool_memory_search.ts");
    const t = tool_memory_search();
    expect(t.name).toBe("memory_search");
    expect(t.parameters.required).toContain("query");
  });
});
