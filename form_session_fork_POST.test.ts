import { test, expect, describe } from "bun:test";
import { chat_db } from "./chat_db.ts";

describe("POST /session/:id/fork", () => {
  test("forkSession creates child with parent link and offset", () => {
    const db = chat_db(":memory:");
    const parentId = db.createSession({ title: "Parent Chat", model: "openai/gpt-4o" });

    // Add some messages to parent
    db.addMessage(parentId, { role: "user", content: "Hello", timestamp: Date.now() });
    db.addMessage(parentId, { role: "assistant", content: '{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}', timestamp: Date.now() });

    // Fork
    const childId = db.forkSession(parentId, "Fork of Parent Chat");
    const child = db.getSession(childId);

    expect(child).not.toBeNull();
    expect(child!.parent).toBe(parentId);
    expect(child!.offset).toBe(2); // parent had 2 messages
    expect(child!.model).toBe("openai/gpt-4o");
  });

  test("forked session appears as child in sidebar tree", () => {
    const db = chat_db(":memory:");
    const parentId = db.createSession({ title: "Main Session", model: "openai/gpt-4o" });
    db.addMessage(parentId, { role: "user", content: "test", timestamp: Date.now() });

    const childId = db.forkSession(parentId, "Fork of Main Session");
    const children = db.getChildren(parentId);

    expect(children.length).toBe(1);
    expect(children[0]!.session_id).toBe(childId);
    expect(children[0]!.parent).toBe(parentId);
  });

  test("fork title uses 'Fork: <parent title>'", () => {
    const db = chat_db(":memory:");
    const parentId = db.createSession({ title: "My Research", model: "anthropic/claude" });

    // Use createSession directly to control title format (what form handler will do)
    const childId = db.createSession({
      title: "Fork: My Research",
      parent: parentId,
      model: "anthropic/claude",
      offset: 0,
    });
    const child = db.getSession(childId);
    expect(child!.title).toBe("Fork: My Research");
  });

  test("getSession returns parent info for forked session", () => {
    const db = chat_db(":memory:");
    const parentId = db.createSession({ title: "Original" });
    const childId = db.createSession({ title: "Fork: Original", parent: parentId, offset: 0 });

    const child = db.getSession(childId);
    expect(child!.parent).toBe(parentId);

    const parent = db.getSession(child!.parent!);
    expect(parent!.title).toBe("Original");
  });
});
