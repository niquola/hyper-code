import { test, expect, describe } from "bun:test";
import { ai_sanitizeSurrogates } from "./ai/sanitizeSurrogates.ts";
import { ai_parseStreamingJson } from "./ai/parseStreamingJson.ts";
import { ai_calculateCost } from "./ai/calculateCost.ts";
import { ai_getEnvApiKey } from "./ai/getEnvApiKey.ts";
import { ai_transformMessages } from "./ai/transformMessages.ts";
import { ai_convertMessages } from "./ai/convertMessages.ts";
import { ai_convertTools } from "./ai/convertTools.ts";
import { ai_stream } from "./ai/stream.ts";
import { ai_models_getAll } from "./ai_models.ts";
import { ai_models_loadIndex } from "./ai/models_loadIndex.ts";
import { agent_createCtx } from "./agent/createCtx.ts";
import { ai_stream_createAssistantMessageEventStream } from "./ai/EventStream.ts";
import type { AssistantMessage, Message, ToolCall, Usage } from "./ai/type_Message.ts";
import type { Model } from "./ai/type_Model.ts";

const lmStudioModel: Model = {
  id: "qwen3-coder-next",
  name: "Qwen3 Coder Next",
  provider: "lmstudio",
  baseUrl: "http://localhost:1234/v1",
  reasoning: true,
  input: ["text"],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 128000,
  maxTokens: 32000,
};

// -- ai_sanitizeSurrogates --

describe("ai_sanitizeSurrogates", () => {
  test("preserves normal text", () => {
    expect(ai_sanitizeSurrogates("hello world")).toBe("hello world");
  });

  test("preserves valid emoji (paired surrogates)", () => {
    expect(ai_sanitizeSurrogates("Hello 🙈 World")).toBe("Hello 🙈 World");
  });

  test("removes unpaired high surrogate", () => {
    const unpaired = `Text ${String.fromCharCode(0xD83D)} here`;
    expect(ai_sanitizeSurrogates(unpaired)).toBe("Text  here");
  });

  test("removes unpaired low surrogate", () => {
    const unpaired = `Text ${String.fromCharCode(0xDE48)} here`;
    expect(ai_sanitizeSurrogates(unpaired)).toBe("Text  here");
  });
});

// -- ai_parseStreamingJson --

describe("ai_parseStreamingJson", () => {
  test("returns empty object for undefined", () => {
    expect(JSON.stringify(ai_parseStreamingJson(undefined))).toBe("{}");
  });

  test("returns empty object for empty string", () => {
    expect(JSON.stringify(ai_parseStreamingJson(""))).toBe("{}");
  });

  test("parses complete JSON", () => {
    const result = ai_parseStreamingJson<{ name: string; value: number }>('{"name":"test","value":42}');
    expect(result.name).toBe("test");
    expect(result.value).toBe(42);
  });

  test("parses incomplete JSON", () => {
    const result = ai_parseStreamingJson<{ name?: string }>('{"name":"test","val');
    expect(result.name).toBe("test");
  });

  test("returns empty object for garbage", () => {
    expect(JSON.stringify(ai_parseStreamingJson("not json at all"))).toBe("{}");
  });
});

// -- ai_calculateCost --

describe("ai_calculateCost", () => {
  test("calculates cost from model pricing", () => {
    const model: Model = {
      id: "test", name: "Test", provider: "test", baseUrl: "",
      reasoning: false, input: ["text"],
      cost: { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
      contextWindow: 128000, maxTokens: 16384,
    };
    const usage: Usage = {
      input: 1000, output: 500, cacheRead: 200, cacheWrite: 0, totalTokens: 1700,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    };
    ai_calculateCost(model, usage);
    expect(usage.cost.input).toBeCloseTo(0.0025);
    expect(usage.cost.output).toBeCloseTo(0.005);
    expect(usage.cost.cacheRead).toBeCloseTo(0.00025);
    expect(usage.cost.total).toBeCloseTo(0.00775);
  });
});

// -- ai_getEnvApiKey --

describe("ai_getEnvApiKey", () => {
  test("returns undefined for unknown provider", () => {
    expect(ai_getEnvApiKey("/tmp", "unknown-provider", {})).toBeUndefined();
  });

  test("reads OPENAI_API_KEY for openai", () => {
    expect(ai_getEnvApiKey("/tmp", "openai", { OPENAI_API_KEY: "test-key-123" })).toBe("test-key-123");
  });
});

// -- ai_transformMessages --

describe("ai_transformMessages", () => {
  test("passes through simple conversation", () => {
    const messages: Message[] = [
      { role: "user", content: "hi", timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "hello" }], provider: "openai", model: "gpt-4o", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: 2 },
    ];
    const result = ai_transformMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0]!.role).toBe("user");
    expect(result[1]!.role).toBe("assistant");
  });

  test("skips errored assistant messages", () => {
    const messages: Message[] = [
      { role: "user", content: "hi", timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "partial" }], provider: "openai", model: "gpt-4o", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "error", errorMessage: "timeout", timestamp: 2 },
    ];
    const result = ai_transformMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0]!.role).toBe("user");
  });

  test("inserts synthetic tool results for orphaned tool calls", () => {
    const messages: Message[] = [
      { role: "user", content: "hi", timestamp: 1 },
      { role: "assistant", content: [
        { type: "text", text: "let me check" },
        { type: "toolCall", id: "tc1", name: "read", arguments: { path: "foo.ts" } },
      ], provider: "openai", model: "gpt-4o", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "toolUse", timestamp: 2 },
      // no tool result — user message interrupts
      { role: "user", content: "never mind", timestamp: 3 },
    ];
    const result = ai_transformMessages(messages);
    expect(result).toHaveLength(4);
    expect(result[2]!.role).toBe("toolResult");
    expect((result[2] as any).toolCallId).toBe("tc1");
    expect((result[2] as any).isError).toBe(true);
  });

  test("removes empty thinking blocks", () => {
    const messages: Message[] = [
      { role: "assistant", content: [
        { type: "thinking", thinking: "" },
        { type: "text", text: "answer" },
      ], provider: "openai", model: "gpt-4o", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: 1 },
    ];
    const result = ai_transformMessages(messages);
    const assistant = result[0] as AssistantMessage;
    expect(assistant.content).toHaveLength(1);
    expect(assistant.content[0]!.type).toBe("text");
  });
});

// -- ai_convertMessages --

describe("ai_convertMessages", () => {
  const model: Model = {
    id: "gpt-4o", name: "GPT-4o", provider: "openai", baseUrl: "https://api.openai.com/v1",
    reasoning: false, input: ["text", "image"],
    cost: { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
    contextWindow: 128000, maxTokens: 16384,
  };

  test("converts system prompt + user message", () => {
    const result = ai_convertMessages(model, {
      systemPrompt: "You are helpful.",
      messages: [{ role: "user", content: "hi", timestamp: 1 }],
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.role).toBe("system");
    expect((result[0] as any).content).toBe("You are helpful.");
    expect(result[1]!.role).toBe("user");
    expect((result[1] as any).content).toBe("hi");
  });

  test("uses developer role for reasoning models", () => {
    const reasoningModel = { ...model, reasoning: true };
    const result = ai_convertMessages(reasoningModel, {
      systemPrompt: "Think carefully.",
      messages: [{ role: "user", content: "hi", timestamp: 1 }],
    });
    expect(result[0]!.role).toBe("developer");
  });

  test("converts assistant with tool calls", () => {
    const result = ai_convertMessages(model, {
      messages: [
        { role: "user", content: "read foo", timestamp: 1 },
        { role: "assistant", content: [
          { type: "text", text: "reading" },
          { type: "toolCall", id: "tc1", name: "read", arguments: { path: "foo.ts" } },
        ], provider: "openai", model: "gpt-4o", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "toolUse", timestamp: 2 },
        { role: "toolResult", toolCallId: "tc1", toolName: "read", content: [{ type: "text", text: "file contents" }], isError: false, timestamp: 3 },
      ],
    });
    expect(result).toHaveLength(3);
    expect(result[1]!.role).toBe("assistant");
    expect((result[1] as any).tool_calls).toHaveLength(1);
    expect((result[1] as any).tool_calls[0].function.name).toBe("read");
    expect(result[2]!.role).toBe("tool");
    expect((result[2] as any).content).toBe("file contents");
  });

  test("skips empty assistant messages", () => {
    const result = ai_convertMessages(model, {
      messages: [
        { role: "user", content: "hi", timestamp: 1 },
        { role: "assistant", content: [], provider: "openai", model: "gpt-4o", usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } }, stopReason: "stop", timestamp: 2 },
      ],
    });
    expect(result).toHaveLength(1);
  });
});

// -- ai_convertTools --

describe("ai_convertTools", () => {
  test("converts tools to OpenAI format", () => {
    const tools = [
      { name: "read", description: "Read a file", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    ];
    const result = ai_convertTools(tools);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe("function");
    const fn = (result[0] as any).function;
    expect(fn.name).toBe("read");
    expect(fn.description).toBe("Read a file");
    expect(fn.parameters).toEqual(tools[0]!.parameters);
  });
});

// -- AssistantMessageEventStream --

describe("AssistantMessageEventStream", () => {
  test("push and iterate events", async () => {
    const stream = ai_stream_createAssistantMessageEventStream();
    const msg: AssistantMessage = {
      role: "assistant", content: [{ type: "text", text: "hi" }],
      provider: "test", model: "test",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: "stop", timestamp: 1,
    };

    // Push events async
    setTimeout(() => {
      stream.push({ type: "start", partial: msg });
      stream.push({ type: "text_start", contentIndex: 0, partial: msg });
      stream.push({ type: "text_delta", contentIndex: 0, delta: "hi", partial: msg });
      stream.push({ type: "text_end", contentIndex: 0, content: "hi", partial: msg });
      stream.push({ type: "done", reason: "stop", message: msg });
      stream.end();
    }, 10);

    const events: string[] = [];
    for await (const event of stream) {
      events.push(event.type);
    }
    expect(events).toEqual(["start", "text_start", "text_delta", "text_end", "done"]);
  });

  test("result() resolves with final message", async () => {
    const stream = ai_stream_createAssistantMessageEventStream();
    const msg: AssistantMessage = {
      role: "assistant", content: [{ type: "text", text: "done" }],
      provider: "test", model: "test",
      usage: { input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: "stop", timestamp: 1,
    };

    setTimeout(() => {
      stream.push({ type: "done", reason: "stop", message: msg });
      stream.end();
    }, 10);

    const result = await stream.result();
    expect(result.content[0]!).toEqual({ type: "text", text: "done" });
    expect(result.stopReason).toBe("stop");
  });

  test("result() resolves with error message", async () => {
    const stream = ai_stream_createAssistantMessageEventStream();
    const msg: AssistantMessage = {
      role: "assistant", content: [],
      provider: "test", model: "test",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: "error", errorMessage: "timeout", timestamp: 1,
    };

    setTimeout(() => {
      stream.push({ type: "error", reason: "error", error: msg });
      stream.end();
    }, 10);

    const result = await stream.result();
    expect(result.stopReason).toBe("error");
    expect(result.errorMessage).toBe("timeout");
  });
});

// -- ai_stream (integration, local LM Studio) --

describe("ai_stream", () => {

  test("streams from LM Studio", async () => {
    const stream = ai_stream(lmStudioModel, {
      messages: [{ role: "user", content: "Reply with exactly: OK", timestamp: Date.now() }],
    }, { apiKey: "lm-studio", maxTokens: 100 });

    const events: string[] = [];
    let text = "";
    for await (const event of stream) {
      events.push(event.type);
      if (event.type === "text_delta") text += event.delta;
    }

    expect(events[0]).toBe("start");
    expect(events).toContain("text_start");
    expect(events).toContain("text_delta");
    expect(events).toContain("text_end");
    expect(events[events.length - 1]).toBe("done");
    expect(text.length).toBeGreaterThan(0);
  });

  test("returns error for missing API key", async () => {
    const model: Model = { ...lmStudioModel, provider: "nonexistent", baseUrl: "http://localhost:99999/v1" };
    const stream = ai_stream(model, {
      messages: [{ role: "user", content: "hi", timestamp: Date.now() }],
    });

    const result = await stream.result();
    expect(result.stopReason).toBe("error");
    expect(result.errorMessage).toContain("No API key");
  });
});

// -- ai_models_getAll --

describe("ai_models_getAll", () => {
  test("has expected models", async () => {
    const cwd = process.cwd();
    const modelIndex = await ai_models_loadIndex(cwd);
    const ctx = agent_createCtx({ model: lmStudioModel, apiKey: "", db: {} as any, cwd, modelIndex });
    const all = await ai_models_getAll(ctx);
    expect(all["gpt-4o"]).toBeDefined();
    expect(all["gpt-4o-mini"]).toBeDefined();
    expect(all["o3-mini"]).toBeDefined();
  });

  test("models have required fields", async () => {
    const cwd = process.cwd();
    const modelIndex = await ai_models_loadIndex(cwd);
    const ctx = agent_createCtx({ model: lmStudioModel, apiKey: "", db: {} as any, cwd, modelIndex });
    const all = await ai_models_getAll(ctx);
    const model = all["gpt-4o"]!;
    expect(model.id).toBe("gpt-4o");
    expect(model.provider).toBe("openai");
    expect(model.baseUrl).toBe("https://api.openai.com/v1");
    expect(model.contextWindow).toBeGreaterThan(0);
    expect(model.maxTokens).toBeGreaterThan(0);
  });
});
