import { test, expect, describe, beforeEach, afterAll } from "bun:test";
import { rmSync, mkdirSync } from "node:fs";
import type { Session } from "./chat_type_Session.ts";

const TEST_DIR = ".hyper-test-subagent";

beforeEach(() => rmSync(TEST_DIR, { recursive: true, force: true }));
afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }));

// Helper: create a session file with messages
async function writeSession(filename: string, lines: string[]) {
  mkdirSync(TEST_DIR, { recursive: true });
  await Bun.write(`${TEST_DIR}/${filename}`, lines.join("\n") + "\n");
}

describe("subagent session creation", () => {
  test("chat_sessionFork copies parent messages to child", async () => {
    const { chat_sessionFork } = await import("./chat_session.ts");
    // Create parent with 2 messages
    const parentFile = "2026-01-01T00-00-00-parent.jsonl";
    await writeSession(parentFile, [
      JSON.stringify({ role: "user", content: "hello", timestamp: 1 }),
      JSON.stringify({ role: "assistant", content: [{ type: "text", text: "hi" }], provider: "t", model: "t", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: 2 }),
    ]);

    const childFile = await chat_sessionFork(parentFile, "fix tests", TEST_DIR);

    // Child file exists and is empty (own messages only)
    const childContent = await Bun.file(`${TEST_DIR}/${childFile}`).text();
    expect(childContent).toBe("");

    // Parent link saved
    const parentLink = await Bun.file(`${TEST_DIR}/${childFile}.parent`).text();
    expect(parentLink.trim()).toBe(parentFile);

    // Title set
    const title = await Bun.file(`${TEST_DIR}/${childFile}.title`).text();
    expect(title).toContain("fix tests");

    // Full load includes parent messages
    const { chat_sessionLoad } = await import("./chat_session.ts");
    // Note: chat_sessionLoad uses global SESSION_DIR, so test with raw
    const { chat_sessionLoadRaw } = await import("./chat_session.ts");
    const ownMsgs = await chat_sessionLoadRaw(childFile, TEST_DIR);
    expect(ownMsgs).toHaveLength(0); // no own messages yet
  });

  test("chat_sessionGetParent returns parent filename", async () => {
    const { chat_sessionGetParent } = await import("./chat_session.ts");
    mkdirSync(TEST_DIR, { recursive: true });
    await Bun.write(`${TEST_DIR}/child.jsonl.parent`, "parent.jsonl");
    const parent = await chat_sessionGetParent("child.jsonl", TEST_DIR);
    expect(parent).toBe("parent.jsonl");
  });

  test("chat_sessionGetParent returns null for root session", async () => {
    const { chat_sessionGetParent } = await import("./chat_session.ts");
    const parent = await chat_sessionGetParent("nonexistent.jsonl", TEST_DIR);
    expect(parent).toBeNull();
  });

  test("chat_sessionGetChildren returns child sessions", async () => {
    const { chat_sessionGetChildren } = await import("./chat_session.ts");
    mkdirSync(TEST_DIR, { recursive: true });
    await Bun.write(`${TEST_DIR}/parent.jsonl`, "");
    await Bun.write(`${TEST_DIR}/child1.jsonl`, "");
    await Bun.write(`${TEST_DIR}/child1.jsonl.parent`, "parent.jsonl");
    await Bun.write(`${TEST_DIR}/child2.jsonl`, "");
    await Bun.write(`${TEST_DIR}/child2.jsonl.parent`, "parent.jsonl");
    await Bun.write(`${TEST_DIR}/other.jsonl`, "");

    const children = await chat_sessionGetChildren("parent.jsonl", TEST_DIR);
    expect(children).toHaveLength(2);
    expect(children).toContain("child1.jsonl");
    expect(children).toContain("child2.jsonl");
  });
});

describe("tool_subagent", () => {
  test("subagent tool has correct metadata", async () => {
    const { tool_subagent } = await import("./tool_subagent.ts");
    const mockSession: Session = { filename: "t.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
    const t = tool_subagent(async (fn: string) => mockSession);
    expect(t.name).toBe("subagent");
    expect(t.description).toContain("sub-agent");
    expect(t.parameters.required).toContain("task");
  });
});

describe("tool_subagent_report", () => {
  test("subagent_report tool has correct metadata", async () => {
    const { tool_subagent_report } = await import("./tool_subagent_report.ts");
    const mockSession: Session = { filename: "t.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
    const t = tool_subagent_report(() => null);
    expect(t.name).toBe("subagent_report");
    expect(t.description).toContain("Report");
  });

  test("subagent_report resolves parent pending subagent", async () => {
    const { tool_subagent_report } = await import("./tool_subagent_report.ts");
    const parentSession: Session = { filename: "parent.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
    const childSession: Session = { filename: "child.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };

    // Simulate pending subagent in parent
    const { promise, resolve } = Promise.withResolvers<string>();
    parentSession.pendingDialogs.set("subagent:child.jsonl", resolve);

    const t = tool_subagent_report(() => parentSession);
    const resultPromise = t.execute({} as any, childSession, { result: "Fixed 3 tests, all passing" });

    const parentResult = await promise;
    expect(parentResult).toBe("Fixed 3 tests, all passing");

    const toolResult = await resultPromise;
    expect(toolResult.content[0]!.type).toBe("text");
  });
});
