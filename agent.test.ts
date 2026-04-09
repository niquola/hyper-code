import { test, expect, describe } from "bun:test";
import { agent_createCtx } from "./agent_createCtx.ts";
import { agent_run } from "./agent_run.ts";
import { agent_abort } from "./agent_abort.ts";
import { agent_executeTools } from "./agent_executeTools.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import type { AgentEvent } from "./agent_type_Event.ts";
import type { AgentTool } from "./agent_type_Tool.ts";
import type { ToolCall } from "./ai_type_Message.ts";
import type { Model } from "./ai_type_Model.ts";

const LM_STUDIO_MODEL: Model = {
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

function createSession(): Session {
  return { filename: "test.jsonl", messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

// -- agent_createCtx --

describe("agent_createCtx", () => {
  test("creates ctx with defaults", () => {
    const ctx = agent_createCtx({ model: LM_STUDIO_MODEL, apiKey: "lm-studio" });
    expect(ctx.model).toBe(LM_STUDIO_MODEL);
    expect(ctx.apiKey).toBe("lm-studio");
    expect(ctx.systemPrompt).toBe("");
    expect(ctx.tools).toEqual([]);
  });

  test("creates ctx with custom values", () => {
    const tool: AgentTool = {
      name: "echo",
      description: "Echo input",
      parameters: { type: "object", properties: { text: { type: "string" } } },
      execute: async (_c: any, _s: any, p: any) => ({ content: [{ type: "text", text: p.text }] }),
    };
    const ctx = agent_createCtx({
      model: LM_STUDIO_MODEL,
      apiKey: "key",
      systemPrompt: "Be helpful",
      tools: [tool],
    });
    expect(ctx.systemPrompt).toBe("Be helpful");
    expect(ctx.tools).toHaveLength(1);
    expect(ctx.tools[0]!.name).toBe("echo");
  });
});

// -- agent_abort --

describe("agent_abort", () => {
  test("does nothing if no active run", () => {
    const session = createSession();
    agent_abort(session); // should not throw
  });

  test("aborts active controller", () => {
    const session = createSession();
    session.abortController = new AbortController();
    expect(session.abortController.signal.aborted).toBe(false);
    agent_abort(session);
    expect(session.abortController.signal.aborted).toBe(true);
  });
});

// -- agent_executeTools --

describe("agent_executeTools", () => {
  test("executes tool and returns result", async () => {
    const ctx = agent_createCtx({
      model: LM_STUDIO_MODEL,
      apiKey: "lm-studio",
      tools: [{
        name: "greet",
        description: "Greet someone",
        parameters: { type: "object", properties: { name: { type: "string" } } },
        execute: async (_c: any, _s: any, p: any) => ({ content: [{ type: "text", text: `Hello ${p.name}!` }] }),
      }],
    });

    const toolCalls: ToolCall[] = [
      { type: "toolCall", id: "tc1", name: "greet", arguments: { name: "World" } },
    ];

    const events: AgentEvent[] = [];
    const results = await agent_executeTools(ctx, createSession(), toolCalls, (e) => events.push(e));

    expect(results).toHaveLength(1);
    expect(results[0]!.toolCallId).toBe("tc1");
    expect(results[0]!.isError).toBe(false);
    expect(results[0]!.content[0]!).toEqual({ type: "text", text: "Hello World!" });

    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe("tool_execution_start");
    expect(events[1]!.type).toBe("tool_execution_end");
  });

  test("handles missing tool", async () => {
    const ctx = agent_createCtx({ model: LM_STUDIO_MODEL, apiKey: "lm-studio" });
    const toolCalls: ToolCall[] = [
      { type: "toolCall", id: "tc1", name: "nonexistent", arguments: {} },
    ];

    const events: AgentEvent[] = [];
    const results = await agent_executeTools(ctx, createSession(), toolCalls, (e) => events.push(e));

    expect(results).toHaveLength(1);
    expect(results[0]!.isError).toBe(true);
    expect((results[0]!.content[0] as any).text).toContain("Tool not found");
  });

  test("handles tool execution error", async () => {
    const ctx = agent_createCtx({
      model: LM_STUDIO_MODEL,
      apiKey: "lm-studio",
      tools: [{
        name: "fail",
        description: "Always fails",
        parameters: {},
        execute: async (_c: any, _s: any) => { throw new Error("kaboom"); },
      }],
    });

    const toolCalls: ToolCall[] = [
      { type: "toolCall", id: "tc1", name: "fail", arguments: {} },
    ];

    const events: AgentEvent[] = [];
    const results = await agent_executeTools(ctx, createSession(), toolCalls, (e) => events.push(e));

    expect(results).toHaveLength(1);
    expect(results[0]!.isError).toBe(true);
    expect((results[0]!.content[0] as any).text).toBe("kaboom");
  });

  test("executes multiple tools sequentially", async () => {
    const order: string[] = [];
    const ctx = agent_createCtx({
      model: LM_STUDIO_MODEL,
      apiKey: "lm-studio",
      tools: [{
        name: "step",
        description: "A step",
        parameters: { type: "object", properties: { n: { type: "number" } } },
        execute: async (_c: any, _s: any, p: any) => { order.push(`step-${p.n}`); return { content: [{ type: "text", text: `done ${p.n}` }] }; },
      }],
    });

    const toolCalls: ToolCall[] = [
      { type: "toolCall", id: "tc1", name: "step", arguments: { n: 1 } },
      { type: "toolCall", id: "tc2", name: "step", arguments: { n: 2 } },
      { type: "toolCall", id: "tc3", name: "step", arguments: { n: 3 } },
    ];

    await agent_executeTools(ctx, createSession(), toolCalls, () => {});
    expect(order).toEqual(["step-1", "step-2", "step-3"]);
  });
});

// -- agent_run (integration with LM Studio) --

describe("agent_run", () => {
  test("simple prompt without tools", async () => {
    const ctx = agent_createCtx({
      model: LM_STUDIO_MODEL,
      apiKey: "lm-studio",
      systemPrompt: "Reply with exactly one word: OK",
    });
    const session = createSession();

    const events: AgentEvent[] = [];
    let text = "";
    await agent_run(ctx, session, "Say OK", (e) => {
      events.push(e);
      if (e.type === "text_delta") text += e.delta;
    });

    expect(events[0]!.type).toBe("agent_start");
    expect(events.some((e) => e.type === "turn_start")).toBe(true);
    expect(events.some((e) => e.type === "turn_end")).toBe(true);
    expect(events[events.length - 1]!.type).toBe("agent_end");
    expect(text.length).toBeGreaterThan(0);
    expect(session.messages).toHaveLength(2); // user + assistant
    expect(session.isStreaming).toBe(false);
  });

  test("prompt with tool call", async () => {
    const ctx = agent_createCtx({
      model: LM_STUDIO_MODEL,
      apiKey: "lm-studio",
      systemPrompt: "You have a read_file tool. When asked to read a file, call it. After getting the result, summarize it briefly.",
      tools: [{
        name: "read_file",
        description: "Read a file and return its contents",
        parameters: { type: "object", properties: { path: { type: "string", description: "File path" } }, required: ["path"] },
        execute: async (_c: any, _s: any, p: any) => ({ content: [{ type: "text", text: `Contents of ${p.path}:\nexport default { port: 3000 };` }] }),
      }],
    });
    const session = createSession();

    const events: AgentEvent[] = [];
    await agent_run(ctx, session, "Read the file config.ts", (e) => events.push(e));

    const toolStarts = events.filter((e) => e.type === "tool_execution_start");
    const toolEnds = events.filter((e) => e.type === "tool_execution_end");
    expect(toolStarts.length).toBeGreaterThanOrEqual(1);
    expect(toolEnds.length).toBeGreaterThanOrEqual(1);

    expect(session.messages.length).toBeGreaterThanOrEqual(4);
    expect(events[events.length - 1]!.type).toBe("agent_end");
    expect(session.isStreaming).toBe(false);
  });

  test("queues follow-up when already streaming", async () => {
    const ctx = agent_createCtx({ model: LM_STUDIO_MODEL, apiKey: "lm-studio" });
    const session = createSession();
    session.isStreaming = true;
    await agent_run(ctx, session, "hi", () => {});
    expect(session.followUpQueue).toContain("hi");
  });

  test("cleans up state after error", async () => {
    const badModel: Model = {
      ...LM_STUDIO_MODEL,
      baseUrl: "http://localhost:99999/v1",
    };
    const ctx = agent_createCtx({ model: badModel, apiKey: "lm-studio" });
    const session = createSession();

    const events: AgentEvent[] = [];
    await agent_run(ctx, session, "hi", (e) => events.push(e));

    expect(session.isStreaming).toBe(false);
    expect(session.abortController).toBeNull();
    expect(events.some((e) => e.type === "error")).toBe(true);
  });
});
