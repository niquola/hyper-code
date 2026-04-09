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
    expect(prompt).toContain("Read files before editing");
    expect(prompt).toContain("grep/find");
  });

  test("contains html_message and html_dialog instructions", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("html_message");
    expect(prompt).toContain("html_dialog");
    expect(prompt).toContain("dispatch");
  });

  test("explains CGI env vars", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("REQUEST_METHOD");
    expect(prompt).toContain("PATH_INFO");
    expect(prompt).toContain("WORKSPACE_DIR");
  });

  test("includes html_dialog examples", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("html_dialog");
    expect(prompt).toContain("check-row");
    expect(prompt).toContain("submit_label");
  });

  test("explains blocking dialog flow", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("blocking tool call");
    expect(prompt).toContain("tool result");
  });

  test("lists use cases for widgets", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("checkboxes");
    expect(prompt).toContain("tables");
  });
});
