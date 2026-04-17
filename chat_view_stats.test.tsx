import { test, expect, describe } from "bun:test";
import { chat_view_stats } from "./chat/view_stats.tsx";
import { queryExists, queryTexts } from "./test_html.ts";
import type { Message, AssistantMessage } from "./ai_type_Message.ts";

describe("chat_view_stats", () => {
  test("returns empty for no messages", () => {
    expect(chat_view_stats([])).toBe("");
  });

  test("shows token count from assistant messages", () => {
    const messages: Message[] = [
      { role: "user", content: "hi", timestamp: 1 },
      {
        role: "assistant",
        content: [{ type: "text", text: "hello" }],
        provider: "test", model: "test",
        usage: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0, totalTokens: 150, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
        stopReason: "stop", timestamp: 2,
      },
    ];
    const html = chat_view_stats(messages);
    expect(html).toContain("150");
    expect(queryExists(html, '[data-role="stats"]')).toBe(true);
  });

  test("aggregates multiple turns", () => {
    const usage = { input: 100, output: 50, cacheRead: 0, cacheWrite: 0, totalTokens: 150, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
    const messages: Message[] = [
      { role: "user", content: "hi", timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "hello" }], provider: "t", model: "t", usage, stopReason: "stop", timestamp: 2 },
      { role: "user", content: "bye", timestamp: 3 },
      { role: "assistant", content: [{ type: "text", text: "goodbye" }], provider: "t", model: "t", usage, stopReason: "stop", timestamp: 4 },
    ];
    const html = chat_view_stats(messages);
    expect(html).toContain("300"); // 150 + 150
  });
});
