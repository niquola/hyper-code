import { test, expect, describe } from "bun:test";
import type { Session } from "./chat_type_Session.ts";

const M = { id: "test", name: "Test", provider: "test", baseUrl: "", reasoning: false, input: ["text"] as string[], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 };

function mockSession(id = "t"): Session {
  return { session_id: id, messages: [], steerQueue: [], followUpQueue: [], abortController: null, model: M as any, apiKey: "test", systemPrompt: "", isStreaming: false, sseListeners: new Set(), pendingDialogs: new Map() };
}

describe("tool_subagent", () => {
  test("has correct metadata", async () => {
    const { tool_subagent } = await import("./tool_subagent.ts");
    const t = tool_subagent(async () => mockSession());
    expect(t.name).toBe("subagent");
    expect(t.parameters.required).toContain("task");
  });
});

describe("tool_subagent_report", () => {
  test("has correct metadata", async () => {
    const { tool_subagent_report } = await import("./tool_subagent_report.ts");
    const t = tool_subagent_report(() => null);
    expect(t.name).toBe("subagent_report");
    expect(t.description).toContain("Report");
  });

  test("resolves parent pending subagent", async () => {
    const { tool_subagent_report } = await import("./tool_subagent_report.ts");
    const parent = mockSession("parent");
    const child = mockSession("child");

    const { promise, resolve } = Promise.withResolvers<string>();
    parent.pendingDialogs.set("subagent:child", resolve);

    const t = tool_subagent_report(() => parent);
    const resultPromise = t.execute({} as any, child, { result: "Fixed 3 tests" });

    expect(await promise).toBe("Fixed 3 tests");
    expect((await resultPromise).content[0]!.type).toBe("text");
  });
});
