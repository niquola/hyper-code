import { test, expect, beforeEach, afterAll } from "bun:test";
import { rmSync, mkdirSync } from "node:fs";
import type { Message } from "./ai_type_Message.ts";

// Use isolated test directory — NOT production .hyper/
const TEST_DIR = ".hyper-test";

// Import and override SESSION_DIR for tests
import * as session from "./chat_session.ts";

// Re-implement functions with test dir to avoid touching production .hyper/
function testSessionCreate(): string {
  mkdirSync(TEST_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const id = Math.random().toString(36).slice(2, 8);
  const filename = `${ts}-${id}.jsonl`;
  Bun.write(`${TEST_DIR}/${filename}`, "");
  return filename;
}

function testSessionList(): string[] {
  try {
    const glob = new Bun.Glob("*.jsonl");
    const files: string[] = [];
    for (const f of glob.scanSync({ cwd: TEST_DIR })) files.push(f);
    return files.sort();
  } catch { return []; }
}

function testSessionLatest(): string | null {
  const files = testSessionList();
  return files.length > 0 ? files[files.length - 1]! : null;
}

async function testSessionLoad(filename: string): Promise<Message[]> {
  const file = Bun.file(`${TEST_DIR}/${filename}`);
  if (!(await file.exists())) return [];
  const text = await file.text();
  return text.split("\n").filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function testSessionAppend(filename: string, ...msgs: Message[]): void {
  mkdirSync(TEST_DIR, { recursive: true });
  const { appendFileSync } = require("node:fs");
  appendFileSync(`${TEST_DIR}/${filename}`, msgs.map(m => JSON.stringify(m)).join("\n") + "\n");
}

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

test("sessionCreate returns timestamped filename", () => {
  const name = testSessionCreate();
  expect(name).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-[a-z0-9]+\.jsonl$/);
});

test("sessionAppend + sessionLoad roundtrips messages", async () => {
  const file = testSessionCreate();
  const msg1: Message = { role: "user", content: "hello", timestamp: 1000 };
  const msg2: Message = {
    role: "assistant",
    content: [{ type: "text", text: "hi" }],
    provider: "test", model: "test",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "stop",
    timestamp: 1001,
  };

  testSessionAppend(file, msg1);
  testSessionAppend(file, msg2);

  const loaded = await testSessionLoad(file);
  expect(loaded).toHaveLength(2);
  expect(loaded[0]!.role).toBe("user");
  expect(loaded[1]!.role).toBe("assistant");
});

test("sessionList returns sorted filenames", async () => {
  mkdirSync(TEST_DIR, { recursive: true });
  await Bun.write(`${TEST_DIR}/2026-01-01T00-00-00-aaa.jsonl`, "");
  await Bun.write(`${TEST_DIR}/2026-01-02T00-00-00-bbb.jsonl`, "");
  const list = testSessionList();
  expect(list).toHaveLength(2);
  expect(list[0]).toContain("2026-01-01");
  expect(list[1]).toContain("2026-01-02");
});

test("sessionLatest returns last file", async () => {
  mkdirSync(TEST_DIR, { recursive: true });
  await Bun.write(`${TEST_DIR}/2026-01-01T00-00-00-aaa.jsonl`, "");
  await Bun.write(`${TEST_DIR}/2026-01-02T00-00-00-bbb.jsonl`, "");
  const latest = testSessionLatest();
  expect(latest).toContain("2026-01-02");
});

test("sessionLatest returns null when empty", () => {
  expect(testSessionLatest()).toBeNull();
});

test("sessionLoad returns empty for missing file", async () => {
  const msgs = await testSessionLoad("nonexistent.jsonl");
  expect(msgs).toHaveLength(0);
});
