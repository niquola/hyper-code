import { test, expect, describe } from "bun:test";
import { agent_buildSystemPrompt } from "./agent_buildSystemPrompt.ts";
import type { AgentTool } from "./agent_type_Tool.ts";

describe("agent_buildSystemPrompt", () => {
  test("includes cwd", () => {
    const prompt = agent_buildSystemPrompt("/tmp/project", []);
    expect(prompt).toContain("/tmp/project");
  });

  test("lists available tools", () => {
    const tools: AgentTool[] = [
      { name: "read", description: "Read a file", parameters: {}, execute: async () => ({ content: [] }) },
      { name: "bash", description: "Run command", parameters: {}, execute: async () => ({ content: [] }) },
    ];
    const prompt = agent_buildSystemPrompt("/tmp", tools);
    expect(prompt).toContain("read");
    expect(prompt).toContain("bash");
  });

  test("contains coding guidelines", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("tool");
  });
});
