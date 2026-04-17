import { test, expect, describe } from "bun:test";
import { chat_db } from "./chat/db.ts";

describe("fork/subagent full context", () => {
  test("getFullMessages chains parent messages for child", () => {
    const db = chat_db(":memory:");
    const parentId = db.createSession({ title: "Parent", model: "openai/gpt-4o" });

    // Parent has 3 messages
    db.addMessage(parentId, { role: "user", content: "Hello", timestamp: 1000 });
    db.addMessage(parentId, { role: "assistant", content: '{"role":"assistant","content":[{"type":"text","text":"Hi!"}],"stopReason":"end","timestamp":1001}', timestamp: 1001 });
    db.addMessage(parentId, { role: "user", content: "What is 2+2?", timestamp: 1002 });

    // Fork at offset=3 (all 3 parent messages)
    const childId = db.forkSession(parentId, "Fork: Parent");
    // Child adds own messages
    db.addMessage(childId, { role: "user", content: "Child question", timestamp: 2000 });
    db.addMessage(childId, { role: "assistant", content: '{"role":"assistant","content":[{"type":"text","text":"Child answer"}],"stopReason":"end","timestamp":2001}', timestamp: 2001 });

    const fullMsgs = db.getFullMessages(childId);
    // Should be: 3 parent + 2 child = 5
    expect(fullMsgs.length).toBe(5);
    expect(fullMsgs[0]!.content).toBe("Hello");
    expect(fullMsgs[2]!.content).toBe("What is 2+2?");
    expect(fullMsgs[3]!.content).toBe("Child question");
    expect(fullMsgs[4]!.content).toContain("Child answer");
  });

  test("getFullMessages respects offset (fork mid-conversation)", () => {
    const db = chat_db(":memory:");
    const parentId = db.createSession({ title: "Parent" });

    db.addMessage(parentId, { role: "user", content: "msg1", timestamp: 1000 });
    db.addMessage(parentId, { role: "user", content: "msg2", timestamp: 1001 });
    db.addMessage(parentId, { role: "user", content: "msg3", timestamp: 1002 });
    db.addMessage(parentId, { role: "user", content: "msg4", timestamp: 1003 });

    // Fork at offset=2 (only first 2 parent messages)
    const childId = db.createSession({ title: "Fork", parent: parentId, offset: 2 });
    db.addMessage(childId, { role: "user", content: "child msg", timestamp: 2000 });

    const fullMsgs = db.getFullMessages(childId);
    expect(fullMsgs.length).toBe(3); // 2 parent + 1 child
    expect(fullMsgs[0]!.content).toBe("msg1");
    expect(fullMsgs[1]!.content).toBe("msg2");
    expect(fullMsgs[2]!.content).toBe("child msg");
  });

  test("getFullMessages chains grandparent → parent → child", () => {
    const db = chat_db(":memory:");
    const gpId = db.createSession({ title: "Grandparent" });
    db.addMessage(gpId, { role: "user", content: "gp msg", timestamp: 1000 });

    const parentId = db.createSession({ title: "Parent", parent: gpId, offset: 1 });
    db.addMessage(parentId, { role: "user", content: "parent msg", timestamp: 2000 });

    // Use getFullMessages for correct offset
    const childId = db.createSession({ title: "Child", parent: parentId, offset: db.getFullMessages(parentId).length });
    db.addMessage(childId, { role: "user", content: "child msg", timestamp: 3000 });

    const fullMsgs = db.getFullMessages(childId);
    expect(fullMsgs.length).toBe(3); // gp + parent + child
    expect(fullMsgs[0]!.content).toBe("gp msg");
    expect(fullMsgs[1]!.content).toBe("parent msg");
    expect(fullMsgs[2]!.content).toBe("child msg");
  });

  test("getFullMessages with forkSession uses correct offset", () => {
    const db = chat_db(":memory:");
    const gpId = db.createSession({ title: "Grandparent" });
    db.addMessage(gpId, { role: "user", content: "gp msg", timestamp: 1000 });

    const parentId = db.forkSession(gpId, "Parent");
    // forkSession offset = getMessageCount(gpId) = 1 (own messages of gp)
    db.addMessage(parentId, { role: "user", content: "parent msg", timestamp: 2000 });

    // Now fork from parent
    const childId = db.forkSession(parentId, "Child");
    // forkSession offset = getMessageCount(parentId) = 1 (own messages of parent)
    // But getFullMessages(parentId) = [gp msg, parent msg] = 2 messages
    // child.offset = 1, so it slices to 1 → only [gp msg]
    // Then adds child own messages → misses "parent msg"!
    db.addMessage(childId, { role: "user", content: "child msg", timestamp: 3000 });

    const fullMsgs = db.getFullMessages(childId);
    const contents = fullMsgs.map(m => m.content);
    expect(contents).toContain("gp msg");
    expect(contents).toContain("parent msg");
    expect(contents).toContain("child msg");
    expect(fullMsgs.length).toBe(3);
  });

  test("getMessages returns ONLY own messages (not parent chain)", () => {
    const db = chat_db(":memory:");
    const parentId = db.createSession({ title: "Parent" });
    db.addMessage(parentId, { role: "user", content: "parent msg", timestamp: 1000 });

    const childId = db.forkSession(parentId, "Child");
    db.addMessage(childId, { role: "user", content: "child msg", timestamp: 2000 });

    const ownMsgs = db.getMessages(childId);
    expect(ownMsgs.length).toBe(1);
    expect(ownMsgs[0]!.content).toBe("child msg");
  });

  test("forkSession offset should equal full message count of parent", () => {
    const db = chat_db(":memory:");
    const parentId = db.createSession({ title: "Parent" });
    db.addMessage(parentId, { role: "user", content: "msg1", timestamp: 1000 });
    db.addMessage(parentId, { role: "user", content: "msg2", timestamp: 1001 });

    const childId = db.forkSession(parentId, "Child");
    const child = db.getSession(childId);

    // For a root parent, getMessageCount == full message count, so this works
    expect(child!.offset).toBe(2);

    // But for nested forks, offset must be based on FULL count
    db.addMessage(childId, { role: "user", content: "child msg", timestamp: 2000 });
    const grandchildId = db.forkSession(childId, "Grandchild");
    const grandchild = db.getSession(grandchildId);

    // forkSession uses getMessageCount(childId) = 1 (own only!)
    // But getFullMessages(childId) = [msg1, msg2, child msg] = 3
    // offset should be 3 to capture full context
    const fullParentMsgs = db.getFullMessages(childId);
    expect(fullParentMsgs.length).toBe(3);
    // Fixed: forkSession now uses getFullMessages().length
    expect(grandchild!.offset).toBe(3);
  });
});
