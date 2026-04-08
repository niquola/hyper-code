import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { tool_hyper_ui } from "./tool_hyper_ui.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "tool-hyper-ui-"));
  writeFileSync(join(tmpDir, "hello.hyper_ui.ts"), `console.log('<h1>Hello from widget</h1>');`);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("tool_hyper_ui", () => {
  test("has correct metadata", () => {
    const tool = tool_hyper_ui(tmpDir);
    expect(tool.name).toBe("hyper_ui");
    expect(tool.description).toContain("widget");
  });

  test("action=list lists widgets", async () => {
    const tool = tool_hyper_ui(tmpDir);
    const result = await tool.execute({ action: "list" });
    const text = (result.content[0] as any).text;
    expect(text).toContain("hello");
  });

  test("action=show renders widget as HTML", async () => {
    const tool = tool_hyper_ui(tmpDir);
    const result = await tool.execute({ action: "show", name: "hello" });
    // Should return HTML content type
    const htmlBlock = result.content.find((c: any) => c.type === "html");
    expect(htmlBlock).toBeDefined();
    expect((htmlBlock as any).html).toContain("Hello from widget");
  });

  test("action=show wraps in container", async () => {
    const tool = tool_hyper_ui(tmpDir);
    const result = await tool.execute({ action: "show", name: "hello" });
    const htmlBlock = result.content.find((c: any) => c.type === "html");
    expect((htmlBlock as any).html).toContain('id="hyper-ui-hello"');
  });

  test("action=show returns error for missing widget", async () => {
    const tool = tool_hyper_ui(tmpDir);
    const result = await tool.execute({ action: "show", name: "nope" });
    const text = (result.content[0] as any).text || (result.content[0] as any).html;
    expect(text).toContain("not found");
  });

  test("action=list returns empty message when no widgets", async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "empty-"));
    const tool = tool_hyper_ui(emptyDir);
    const result = await tool.execute({ action: "list" });
    expect((result.content[0] as any).text).toContain("No widgets");
    rmSync(emptyDir, { recursive: true });
  });
});
