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

  test("contains render_html and html_dialog instructions", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("render_html");
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

  test("explains dispatch flow", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("User interaction from widget");
    expect(prompt).toContain("modal");
  });

  test("lists use cases for widgets", () => {
    const prompt = agent_buildSystemPrompt("/tmp", []);
    expect(prompt).toContain("checkboxes");
    expect(prompt).toContain("tables");
  });
});
