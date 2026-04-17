import { test, expect, describe } from "bun:test";
import { chat_view_userMessage, chat_view_assistantMessage, chat_view_toolCall, chat_view_error } from "./view_message.tsx";
import { chat_view_page } from "./view_page.tsx";
import { pageState } from "../cdp/pageState.ts";
import { queryExists, queryTexts, queryAttrs } from "../test_html.ts";
import type { Message } from "../ai/type_Message.ts";

// -- chat_view_userMessage --

describe("chat_view_userMessage", () => {
  test("renders user message with data attributes", () => {
    const html = chat_view_userMessage("Hello world");
    expect(queryExists(html, '[data-entity="message"]')).toBe(true);
    expect(queryExists(html, '[data-status="user"]')).toBe(true);
    expect(queryExists(html, '[data-role="content"]')).toBe(true);
    expect(queryTexts(html, '[data-role="content"]')).toEqual(["Hello world"]);
  });

  test("escapes HTML in content", () => {
    const html = chat_view_userMessage("<script>alert(1)</script>");
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  test("shows rewind button with session and index", () => {
    const html = chat_view_userMessage("hi", 3, "sess-1");
    expect(html).toContain("/session/sess-1/rewind?index=3");
    expect(html).toContain("Rewind to here");
  });

  test("shows fork button with session and index", () => {
    const html = chat_view_userMessage("hi", 3, "sess-1");
    expect(html).toContain("hx-post=\"/session/sess-1/fork\"");
    expect(html).toContain('"offset":"4"');
    expect(html).toContain("Fork from here");
  });

  test("no rewind/fork without sessionId", () => {
    const html = chat_view_userMessage("hi", 3);
    expect(html).not.toContain("rewind");
    expect(html).not.toContain("fork");
  });

  test("no rewind/fork without messageIndex", () => {
    const html = chat_view_userMessage("hi");
    expect(html).not.toContain("rewind");
    expect(html).not.toContain("fork");
  });
});

// -- chat_view_assistantMessage --

describe("chat_view_assistantMessage", () => {
  test("renders assistant message with data attributes", async () => {
    const html = await chat_view_assistantMessage("The answer is 42.");
    expect(queryExists(html, '[data-entity="message"]')).toBe(true);
    expect(queryExists(html, '[data-status="assistant"]')).toBe(true);
    expect(queryExists(html, '[data-role="content"]')).toBe(true);
  });

  test("renders thinking block when provided", async () => {
    const html = await chat_view_assistantMessage("answer", "let me think...");
    expect(queryExists(html, '[data-role="thinking"]')).toBe(true);
    expect(queryTexts(html, '[data-role="thinking"]')).toEqual(["let me think..."]);
  });

  test("omits thinking when not provided", async () => {
    const html = await chat_view_assistantMessage("answer");
    expect(queryExists(html, '[data-role="thinking"]')).toBe(false);
  });

  test("renders markdown in content", async () => {
    const html = await chat_view_assistantMessage("**bold** text");
    expect(html).toContain("<strong>bold</strong>");
  });

  test("renders code blocks with shiki", async () => {
    const html = await chat_view_assistantMessage("```js\nconsole.log(1)\n```");
    // Shiki wraps in <pre> with class
    expect(html).toContain("<pre");
    expect(html).toContain("console");
  });
});

// -- chat_view_toolCall --

describe("chat_view_toolCall", () => {
  test("renders tool with done status", () => {
    const html = chat_view_toolCall("read", '{"path":"foo.ts"}', "file contents", false);
    expect(queryExists(html, '[data-entity="tool"]')).toBe(true);
    expect(queryAttrs(html, '[data-entity="tool"]', 'data-status')).toEqual(["done"]);
    expect(queryTexts(html, '[data-role="tool-name"]')).toEqual(["read"]);
  });

  test("renders tool with error status", () => {
    const html = chat_view_toolCall("bash", '{"cmd":"fail"}', "command failed", true);
    expect(queryAttrs(html, '[data-entity="tool"]', 'data-status')).toEqual(["error"]);
  });

  test("renders tool with running status when no result", () => {
    const html = chat_view_toolCall("read", '{"path":"foo.ts"}');
    expect(queryAttrs(html, '[data-entity="tool"]', 'data-status')).toEqual(["running"]);
  });
});

// -- chat_view_error --

describe("chat_view_error", () => {
  test("renders error with data attributes", () => {
    const html = chat_view_error("Something went wrong");
    expect(queryExists(html, '[data-status="error"]')).toBe(true);
    expect(queryTexts(html, '[data-role="content"]')).toEqual(["Something went wrong"]);
  });
});

// -- chat_view_page --

describe("chat_view_page", () => {
  test("renders empty chat page with form", async () => {
    const html = await chat_view_page([]);
    const state = pageState(html);
    expect(state.page).toBe("chat");
    expect(state.forms).toHaveLength(1);
    expect(state.forms[0]!.name).toBe("prompt");
    // send button removed — Enter to send
  });

  test("renders messages in history", async () => {
    const messages: Message[] = [
      { role: "user", content: "hi", timestamp: 1 },
      {
        role: "assistant",
        content: [{ type: "text", text: "hello" }],
        provider: "test", model: "test",
        usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: "stop", timestamp: 2,
      },
    ];
    const html = await chat_view_page(messages);
    const state = pageState(html);
    expect(state.entities).toHaveLength(2);
    expect(state.entities[0]!.status).toBe("user");
    expect(state.entities[1]!.status).toBe("assistant");
  });

  test("renders tool results paired with tool calls", async () => {
    const messages: Message[] = [
      { role: "assistant", content: [{ type: "toolCall", id: "tc1", name: "read", arguments: { path: "test.ts" } }], provider: "t", model: "t", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: 1 },
      { role: "toolResult", toolCallId: "tc1", toolName: "read", content: [{ type: "text", text: "file data" }], isError: false, timestamp: 2 },
    ];
    const html = await chat_view_page(messages);
    const state = pageState(html);
    expect(state.entities.filter(e => e.type === "tool")).toHaveLength(1);
  });
});
