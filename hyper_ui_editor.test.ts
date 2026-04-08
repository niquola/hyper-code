import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { hyper_ui_run } from "./hyper_ui_run.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "editor-test-"));
  writeFileSync(join(tmpDir, "test.ts"), `const x = 1;\nconsole.log(x);\n`);
  writeFileSync(join(tmpDir, "style.css"), `body { color: red; }\n`);

  // Copy the editor widget to tmpDir
  const editorSrc = await Bun.file("./hyper_ui_editor.ts").text();
  await Bun.write(join(tmpDir, "hyper_ui_editor.ts"), editorSrc);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("hyper_ui_editor", () => {
  test("renders editor for a file", async () => {
    const html = await hyper_ui_run(tmpDir, "editor", {
      method: "GET", path: "/", query: "file=test.ts", body: "",
    });
    expect(html).toContain("test.ts");
    expect(html).toContain("CodeMirror");
    expect(html).toContain("const x = 1");
    expect(html).toContain("Save");
    expect(html).toContain("Revert");
  });

  test("detects typescript language", async () => {
    const html = await hyper_ui_run(tmpDir, "editor", {
      method: "GET", path: "/", query: "file=test.ts", body: "",
    });
    expect(html).toContain("typescript");
  });

  test("detects css language", async () => {
    const html = await hyper_ui_run(tmpDir, "editor", {
      method: "GET", path: "/", query: "file=style.css", body: "",
    });
    expect(html).toContain("css");
  });

  test("shows error without file param", async () => {
    const html = await hyper_ui_run(tmpDir, "editor", {
      method: "GET", path: "/", query: "", body: "",
    });
    expect(html).toContain("No file specified");
  });

  test("saves file content", async () => {
    const html = await hyper_ui_run(tmpDir, "editor", {
      method: "POST", path: "/save",
      query: "", body: "file=test.ts&content=const+y+%3D+2%3B",
    });
    expect(html).toContain("Saved");

    // Verify file was written
    const content = await Bun.file(join(tmpDir, "test.ts")).text();
    expect(content).toBe("const y = 2;");
  });

  test("handles missing file on save", async () => {
    const html = await hyper_ui_run(tmpDir, "editor", {
      method: "POST", path: "/save",
      query: "", body: "content=hello",
    });
    expect(html).toContain("Missing");
  });

  test("handles new (nonexistent) file", async () => {
    const html = await hyper_ui_run(tmpDir, "editor", {
      method: "GET", path: "/", query: "file=new-file.ts", body: "",
    });
    // Should show editor with empty content, no error
    expect(html).toContain("new-file.ts");
    expect(html).toContain("CodeMirror");
  });
});
