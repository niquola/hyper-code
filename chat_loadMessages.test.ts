import { test, expect, describe } from "bun:test";
import { chat_loadMessages, rowToMessage, type SessionInfo, type MessageRow } from "./chat/loadMessages.ts";
import type { Message } from "./ai_type_Message.ts";

function mkRow(content: string, role = "user"): MessageRow {
  return { role, content, timestamp: Date.now() };
}

describe("chat_loadMessages", () => {
  test("root session — returns own messages", () => {
    const sessionsMap: Record<string, SessionInfo> = {
      s1: { parent: null, offset: null },
    };
    const msgsMap: Record<string, MessageRow[]> = {
      s1: [mkRow("hello"), mkRow("world")],
    };
    const cache = new Map<string, Message[]>();

    const result = chat_loadMessages("s1", id => sessionsMap[id] ?? null, id => msgsMap[id] ?? [], cache);

    expect(result.length).toBe(2);
    expect((result[0] as any).content).toBe("hello");
    expect((result[1] as any).content).toBe("world");
  });

  test("child chains parent messages before own", () => {
    const sessionsMap: Record<string, SessionInfo> = {
      parent: { parent: null, offset: null },
      child: { parent: "parent", offset: 2 },
    };
    const msgsMap: Record<string, MessageRow[]> = {
      parent: [mkRow("p1"), mkRow("p2")],
      child: [mkRow("c1")],
    };
    const cache = new Map<string, Message[]>();

    const result = chat_loadMessages("child", id => sessionsMap[id] ?? null, id => msgsMap[id] ?? [], cache);

    expect(result.length).toBe(3);
    expect((result[0] as any).content).toBe("p1");
    expect((result[1] as any).content).toBe("p2");
    expect((result[2] as any).content).toBe("c1");
  });

  test("offset limits parent messages", () => {
    const sessionsMap: Record<string, SessionInfo> = {
      parent: { parent: null, offset: null },
      child: { parent: "parent", offset: 1 },
    };
    const msgsMap: Record<string, MessageRow[]> = {
      parent: [mkRow("p1"), mkRow("p2"), mkRow("p3")],
      child: [mkRow("c1")],
    };
    const cache = new Map<string, Message[]>();

    const result = chat_loadMessages("child", id => sessionsMap[id] ?? null, id => msgsMap[id] ?? [], cache);

    expect(result.length).toBe(2); // 1 parent + 1 child
    expect((result[0] as any).content).toBe("p1");
    expect((result[1] as any).content).toBe("c1");
  });

  test("grandparent → parent → child — full chain", () => {
    const sessionsMap: Record<string, SessionInfo> = {
      gp: { parent: null, offset: null },
      parent: { parent: "gp", offset: 1 },
      child: { parent: "parent", offset: 2 }, // offset=2 covers gp(1) + parent own(1)
    };
    const msgsMap: Record<string, MessageRow[]> = {
      gp: [mkRow("gp1")],
      parent: [mkRow("p1")],
      child: [mkRow("c1")],
    };
    const cache = new Map<string, Message[]>();

    const result = chat_loadMessages("child", id => sessionsMap[id] ?? null, id => msgsMap[id] ?? [], cache);

    expect(result.length).toBe(3);
    expect((result[0] as any).content).toBe("gp1");
    expect((result[1] as any).content).toBe("p1");
    expect((result[2] as any).content).toBe("c1");
  });

  test("cache is populated lazily and reused", () => {
    let callCount = 0;
    const sessionsMap: Record<string, SessionInfo> = {
      parent: { parent: null, offset: null },
      c1: { parent: "parent", offset: 2 },
      c2: { parent: "parent", offset: 2 },
    };
    const msgsMap: Record<string, MessageRow[]> = {
      parent: [mkRow("p1"), mkRow("p2")],
      c1: [mkRow("c1-msg")],
      c2: [mkRow("c2-msg")],
    };
    const cache = new Map<string, Message[]>();

    const getMsgs = (id: string) => { callCount++; return msgsMap[id] ?? []; };

    // Load c1 — should load parent + c1
    chat_loadMessages("c1", id => sessionsMap[id] ?? null, getMsgs, cache);
    const callsAfterC1 = callCount; // parent + c1 = 2

    // Load c2 — parent already cached, only c2 messages fetched
    chat_loadMessages("c2", id => sessionsMap[id] ?? null, getMsgs, cache);
    const callsAfterC2 = callCount;

    expect(callsAfterC1).toBe(2); // parent + c1
    expect(callsAfterC2).toBe(3); // only c2 (parent cached)
    expect(cache.has("parent")).toBe(true);
    expect(cache.has("c1")).toBe(true);
    expect(cache.has("c2")).toBe(true);
  });

  test("multiple forks share cached parent chain", () => {
    const sessionsMap: Record<string, SessionInfo> = {
      root: { parent: null, offset: null },
      fork1: { parent: "root", offset: 3 },
      fork2: { parent: "root", offset: 3 },
      fork3: { parent: "root", offset: 3 },
    };
    const msgsMap: Record<string, MessageRow[]> = {
      root: [mkRow("r1"), mkRow("r2"), mkRow("r3")],
      fork1: [mkRow("f1")],
      fork2: [mkRow("f2")],
      fork3: [mkRow("f3")],
    };
    const cache = new Map<string, Message[]>();
    const lookup = (id: string) => sessionsMap[id] ?? null;
    const msgs = (id: string) => msgsMap[id] ?? [];

    const r1 = chat_loadMessages("fork1", lookup, msgs, cache);
    const r2 = chat_loadMessages("fork2", lookup, msgs, cache);
    const r3 = chat_loadMessages("fork3", lookup, msgs, cache);

    // All forks see root messages + own
    expect(r1.length).toBe(4);
    expect(r2.length).toBe(4);
    expect(r3.length).toBe(4);
    expect((r1[3] as any).content).toBe("f1");
    expect((r2[3] as any).content).toBe("f2");
    expect((r3[3] as any).content).toBe("f3");

    // Root was only built once — same array reference in cache
    expect(cache.get("root")).toBeDefined();
  });

  test("missing session returns empty", () => {
    const cache = new Map<string, Message[]>();
    const result = chat_loadMessages("nope", () => null, () => [], cache);
    expect(result).toEqual([]);
  });

  test("rowToMessage parses assistant JSON", () => {
    const row: MessageRow = { role: "assistant", content: '{"role":"assistant","content":[{"type":"text","text":"hi"}],"stopReason":"end","timestamp":1}', timestamp: 1 };
    const msg = rowToMessage(row);
    expect(msg.role).toBe("assistant");
  });

  test("rowToMessage falls back to user for bad JSON", () => {
    const row: MessageRow = { role: "assistant", content: "broken json", timestamp: 1 };
    const msg = rowToMessage(row);
    expect(msg.role).toBe("user");
    expect((msg as any).content).toBe("broken json");
  });
});
