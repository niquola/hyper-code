import { test, expect } from "bun:test";
import { tool_html_dialog } from "./tool_html_dialog.ts";
import type { Session } from "./chat_type_Session.ts";

function mockSession(): Session {
  return { session_id: "test.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, model: { id: "test", name: "Test", provider: "test", baseUrl: "", reasoning: false, input: ["text"], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 }, apiKey: "test", systemPrompt: "", isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

test("returns dialog HTML and blocks until resolved", async () => {
  const session = mockSession();
  const t = tool_html_dialog();

  // Start execute — will block on pending dialog
  const resultPromise = t.execute({} as any, session, { title: "Pick one", html: '<input name="choice" value="a" />' });

  // Dialog should be pending
  await Bun.sleep(10);
  expect(session.pendingDialogs.size).toBe(1);

  // Simulate user response
  const [id, resolve] = [...session.pendingDialogs.entries()][0]!;
  resolve("choice: a");

  const result = await resultPromise;
  expect(result.content.some((c) => c.type === "text" && (c as any).text === "choice: a")).toBe(true);
  expect(session.pendingDialogs.size).toBe(0);
});

test("dialog HTML has correct structure", async () => {
  const session = mockSession();
  const t = tool_html_dialog();

  // Capture emitted HTML
  let emittedHtml = "";
  session.emitHtml = (html) => { emittedHtml = html; };

  const resultPromise = t.execute({} as any, session, { title: "Test", html: '<input name="x" />', submit_label: "Go" });
  await Bun.sleep(10);

  expect(emittedHtml).toContain("<dialog");
  expect(emittedHtml).toContain("Test");
  expect(emittedHtml).toContain('name="x"');
  expect(emittedHtml).toContain("Go");
  expect(emittedHtml).toContain("Cancel");
  expect(emittedHtml).toContain("submitDialog");
  expect(emittedHtml).toContain("showModal");

  // Resolve to finish
  const [, resolve] = [...session.pendingDialogs.entries()][0]!;
  resolve("done");
  await resultPromise;
});

test("dialog id is session-scoped and unique", async () => {
  const session = mockSession();
  const t = tool_html_dialog();

  const p1 = t.execute({} as any, session, { title: "A", html: '<input name="a" />' });
  const p2 = t.execute({} as any, session, { title: "B", html: '<input name="b" />' });
  await Bun.sleep(10);

  const ids = [...session.pendingDialogs.keys()];
  expect(ids.length).toBe(2);
  expect(ids[0]!.startsWith("dlg-test.jsonl-")).toBe(true);
  expect(ids[1]!.startsWith("dlg-test.jsonl-")).toBe(true);
  expect(ids[0]).not.toBe(ids[1]);

  session.pendingDialogs.get(ids[0]!)!("ok1");
  session.pendingDialogs.get(ids[1]!)!("ok2");
  await p1;
  await p2;
});

test("has correct metadata", () => {
  const t = tool_html_dialog();
  expect(t.name).toBe("html_dialog");
  expect(t.description).toContain("blocking");
});
