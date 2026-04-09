import { test, expect } from "bun:test";
import { tool_html_dialog } from "./tool_html_dialog.ts";
import type { Session } from "./chat_type_Session.ts";

function mockSession(): Session {
  return { filename: "test.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
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

test("has correct metadata", () => {
  const t = tool_html_dialog();
  expect(t.name).toBe("html_dialog");
  expect(t.description).toContain("blocking");
});
