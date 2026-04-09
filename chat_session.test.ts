import { test, expect, beforeEach, afterAll } from "bun:test";
import { chat_sessionCreate, chat_sessionLoad, chat_sessionAppend, chat_sessionList, chat_sessionLatest } from "./chat_session.ts";
import { rmSync, mkdirSync } from "node:fs";
import type { Message } from "./ai_type_Message.ts";

const TEST_DIR = ".hyper";

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test("chat_sessionCreate returns timestamped filename", () => {
  const name = chat_sessionCreate();
  expect(name).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9]+\.jsonl$/);
});

test("chat_sessionAppend + chat_sessionLoad roundtrips messages", async () => {
  const file = chat_sessionCreate();
  const msg1: Message = { role: "user", content: "hello", timestamp: 1000 };
  const msg2: Message = {
    role: "assistant",
    content: [{ type: "text", text: "hi" }],
    provider: "test", model: "test",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "stop",
    timestamp: 1001,
  };

  chat_sessionAppend(file, msg1);
  chat_sessionAppend(file, msg2);

  const loaded = await chat_sessionLoad(file);
  expect(loaded).toHaveLength(2);
  expect(loaded[0]!.role).toBe("user");
  expect(loaded[1]!.role).toBe("assistant");
});

test("chat_sessionList returns sorted filenames", async () => {
  mkdirSync(TEST_DIR, { recursive: true });
  await Bun.write(`${TEST_DIR}/2026-01-01T00-00-00-aaa.jsonl`, "");
  await Bun.write(`${TEST_DIR}/2026-01-02T00-00-00-bbb.jsonl`, "");
  const list = chat_sessionList();
  expect(list).toHaveLength(2);
  expect(list[0]).toContain("2026-01-01");
  expect(list[1]).toContain("2026-01-02");
});

test("chat_sessionLatest returns last file", async () => {
  mkdirSync(TEST_DIR, { recursive: true });
  await Bun.write(`${TEST_DIR}/2026-01-01T00-00-00-aaa.jsonl`, "");
  await Bun.write(`${TEST_DIR}/2026-01-02T00-00-00-bbb.jsonl`, "");
  const latest = chat_sessionLatest();
  expect(latest).toContain("2026-01-02");
});

test("chat_sessionLatest returns null when empty", () => {
  expect(chat_sessionLatest()).toBeNull();
});

test("chat_sessionLoad returns empty for missing file", async () => {
  const msgs = await chat_sessionLoad("nonexistent.jsonl");
  expect(msgs).toHaveLength(0);
});
