import { test, expect, describe } from "bun:test";
import { ai_convertMessages } from "./ai/convertMessages.ts";
import type { Model } from "./ai/type_Model.ts";
import type { AssistantMessage, Context } from "./ai/type_Message.ts";

const model: Model = {
  id: "gpt-4o", name: "GPT-4o", provider: "openai", baseUrl: "https://api.openai.com/v1",
  reasoning: false, input: ["text", "image"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000, maxTokens: 16384,
};

const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };

describe("ai_convertMessages edge cases", () => {
  test("handles image content in user message", () => {
    const result = ai_convertMessages(model, {
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "What is this?" },
          { type: "image", data: "base64data", mimeType: "image/png" },
        ],
        timestamp: 1,
      }],
    });
    expect(result).toHaveLength(1);
    expect((result[0] as any).content).toHaveLength(2);
    expect((result[0] as any).content[1].type).toBe("image_url");
  });

  test("strips images for text-only models", () => {
    const textModel = { ...model, input: ["text"] as ("text")[] };
    const result = ai_convertMessages(textModel, {
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "text" },
          { type: "image", data: "x", mimeType: "image/png" },
        ],
        timestamp: 1,
      }],
    });
    expect((result[0] as any).content).toHaveLength(1);
  });

  test("handles multiple tool results in sequence", () => {
    const result = ai_convertMessages(model, {
      messages: [
        { role: "user", content: "do both", timestamp: 1 },
        {
          role: "assistant",
          content: [
            { type: "toolCall", id: "tc1", name: "a", arguments: {} },
            { type: "toolCall", id: "tc2", name: "b", arguments: {} },
          ],
          provider: "t", model: "t", usage, stopReason: "toolUse", timestamp: 2,
        },
        { role: "toolResult", toolCallId: "tc1", toolName: "a", content: [{ type: "text", text: "r1" }], isError: false, timestamp: 3 },
        { role: "toolResult", toolCallId: "tc2", toolName: "b", content: [{ type: "text", text: "r2" }], isError: false, timestamp: 4 },
      ],
    });
    const toolMsgs = result.filter((m) => m.role === "tool");
    expect(toolMsgs).toHaveLength(2);
  });

  test("empty context returns empty", () => {
    const result = ai_convertMessages(model, { messages: [] });
    expect(result).toHaveLength(0);
  });

  test("system prompt only", () => {
    const result = ai_convertMessages(model, { systemPrompt: "Be helpful", messages: [] });
    expect(result).toHaveLength(1);
    expect(result[0]!.role).toBe("system");
  });
});
