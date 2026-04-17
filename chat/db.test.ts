import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";

// We'll test the db module functions directly
// Using in-memory DB for tests

describe("chat_db", () => {
  let db: ReturnType<typeof import("./db.ts")["chat_db"]>;

  beforeEach(async () => {
    const mod = await import("./db.ts");
    db = mod.chat_db(":memory:");
  });

  // --- Sessions ---

  test("createSession returns filename", () => {
    const filename = db.createSession({ model: "kimi-coding/k2p5" });
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("getSession returns created session", () => {
    const filename = db.createSession({ title: "test", model: "kimi-coding/k2p5" });
    const s = db.getSession(filename);
    expect(s).toBeTruthy();
    expect(s!.title).toBe("test");
    expect(s!.model).toBe("kimi-coding/k2p5");
  });

  test("listSessions returns all sessions", () => {
    db.createSession({ title: "first", model: "a/b" });
    db.createSession({ title: "second", model: "a/b" });
    const list = db.listSessions();
    expect(list).toHaveLength(2);
    expect(list.map(s => s.title)).toContain("first");
    expect(list.map(s => s.title)).toContain("second");
  });

  test("deleteSession removes session and messages", () => {
    const f = db.createSession({ model: "a/b" });
    db.addMessage(f, { role: "user", content: "hi", timestamp: 1 });
    db.deleteSession(f);
    expect(db.getSession(f)).toBeNull();
    expect(db.getMessages(f)).toHaveLength(0);
  });

  test("setSessionTitle updates title", () => {
    const f = db.createSession({ model: "a/b" });
    db.setSessionTitle(f, "new title");
    expect(db.getSession(f)!.title).toBe("new title");
  });

  test("forkSession creates child with parent link", () => {
    const parent = db.createSession({ title: "parent", model: "a/b" });
    db.addMessage(parent, { role: "user", content: "hello", timestamp: 1 });
    const child = db.forkSession(parent, "fix tests", 1);
    const s = db.getSession(child);
    expect(s!.parent).toBe(parent);
    expect(s!.title).toContain("fix tests");
    expect(s!.offset).toBe(1);
    // Child has no own messages
    expect(db.getMessages(child)).toHaveLength(0);
  });

  test("getChildren returns child sessions", () => {
    const parent = db.createSession({ model: "a/b" });
    const c1 = db.forkSession(parent, "task1");
    const c2 = db.forkSession(parent, "task2");
    const children = db.getChildren(parent);
    expect(children).toHaveLength(2);
  });

  // --- Messages ---

  test("addMessage and getMessages", () => {
    const f = db.createSession({ model: "a/b" });
    db.addMessage(f, { role: "user", content: "hello", timestamp: 1000 });
    db.addMessage(f, { role: "assistant", content: JSON.stringify([{ type: "text", text: "hi" }]), timestamp: 1001 });
    const msgs = db.getMessages(f);
    expect(msgs).toHaveLength(2);
    expect(msgs[0]!.role).toBe("user");
    expect(msgs[1]!.role).toBe("assistant");
  });

  test("getFullMessages chains parent + own", () => {
    const parent = db.createSession({ model: "a/b" });
    db.addMessage(parent, { role: "user", content: "parent msg", timestamp: 1 });
    db.addMessage(parent, { role: "assistant", content: "parent reply", timestamp: 2 });
    const child = db.forkSession(parent, "task", 2);
    db.addMessage(child, { role: "user", content: "child msg", timestamp: 3 });
    const full = db.getFullMessages(child);
    expect(full).toHaveLength(3); // 2 parent + 1 child
    expect(full[0]!.content).toBe("parent msg");
    expect(full[2]!.content).toBe("child msg");
  });

  test("getFullMessages respects offset", () => {
    const parent = db.createSession({ model: "a/b" });
    db.addMessage(parent, { role: "user", content: "msg1", timestamp: 1 });
    db.addMessage(parent, { role: "user", content: "msg2", timestamp: 2 });
    db.addMessage(parent, { role: "user", content: "msg3", timestamp: 3 });
    const child = db.forkSession(parent, "task", 2); // only first 2
    db.addMessage(child, { role: "user", content: "child", timestamp: 4 });
    const full = db.getFullMessages(child);
    expect(full).toHaveLength(3); // 2 parent + 1 child
    expect(full[1]!.content).toBe("msg2");
    expect(full[2]!.content).toBe("child");
  });

  test("rewindMessages truncates to index", () => {
    const f = db.createSession({ model: "a/b" });
    db.addMessage(f, { role: "user", content: "a", timestamp: 1 });
    db.addMessage(f, { role: "assistant", content: "b", timestamp: 2 });
    db.addMessage(f, { role: "user", content: "c", timestamp: 3 });
    db.rewindMessages(f, 1); // keep only first message
    expect(db.getMessages(f)).toHaveLength(1);
  });

  // --- API Keys ---

  test("saveApiKey and getApiKey", () => {
    db.saveApiKey("kimi-coding", "sk-kimi-123");
    expect(db.getApiKey("kimi-coding")).toBe("sk-kimi-123");
  });

  test("getApiKey returns empty for unknown", () => {
    expect(db.getApiKey("unknown")).toBe("");
  });

  test("saveApiKey overwrites", () => {
    db.saveApiKey("test", "old");
    db.saveApiKey("test", "new");
    expect(db.getApiKey("test")).toBe("new");
  });

  // --- Unread ---

  test("markRead and getUnread", () => {
    db.markRead("session1", 5);
    expect(db.getUnread("session1", 5)).toBe(0);
    expect(db.getUnread("session1", 7)).toBe(2);
  });

  test("getUnread returns 0 for untracked session", () => {
    expect(db.getUnread("unknown", 10)).toBe(0);
  });

  // --- Search ---

  test("searchMessages finds user messages", () => {
    const f = db.createSession({ title: "test", model: "a/b" });
    db.addMessage(f, { role: "user", content: "fix the OAuth bug", timestamp: 1 });
    db.addMessage(f, { role: "assistant", content: "done fixing", timestamp: 2 });
    db.addMessage(f, { role: "user", content: "now add tests", timestamp: 3 });
    const results = db.searchMessages("OAuth");
    expect(results).toHaveLength(1);
    expect(results[0]!.content).toContain("OAuth");
    expect(results[0]!.session).toBe(f);
  });

  test("searchMessages with role filter", () => {
    const f = db.createSession({ title: "test", model: "a/b" });
    db.addMessage(f, { role: "user", content: "hello world", timestamp: 1 });
    db.addMessage(f, { role: "assistant", content: "hello back", timestamp: 2 });
    expect(db.searchMessages("hello", "user")).toHaveLength(1);
    expect(db.searchMessages("hello")).toHaveLength(2);
  });

  test("searchMessages returns session title", () => {
    const f = db.createSession({ title: "My Chat", model: "a/b" });
    db.addMessage(f, { role: "user", content: "test query", timestamp: 1 });
    const results = db.searchMessages("test");
    expect(results[0]!.sessionTitle).toBe("My Chat");
  });
});
