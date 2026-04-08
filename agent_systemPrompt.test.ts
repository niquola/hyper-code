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

  test("contains hyper_ui instructions", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("hyper_ui");
    expect(prompt).toContain(".hyper_ui.ts");
    expect(prompt).toContain("CGI");
    expect(prompt).toContain("/dispatch");
  });

  test("explains CGI env vars", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("REQUEST_METHOD");
    expect(prompt).toContain("PATH_INFO");
    expect(prompt).toContain("WORKSPACE_DIR");
  });

  test("includes widget example code", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("hx-post");
    expect(prompt).toContain("hx-target");
  });

  test("explains dispatch mechanism with htmx", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("hx-post");
    expect(prompt).toContain("/dispatch");
    expect(prompt).toContain("Approve");
    expect(prompt).toContain("never plain");
  });

  test("lists use cases for widgets", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("checkboxes");
    expect(prompt).toContain("tables");
  });
});
