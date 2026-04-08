import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { widget_editor } from "./widget_editor.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "widget-editor-"));
  writeFileSync(join(tmpDir, "test.ts"), `const x = 1;\nconsole.log(x);\n`);
  writeFileSync(join(tmpDir, "style.css"), `body { color: red; }\n`);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("widget_editor", () => {
  test("renders editor for a file", async () => {
    const req = new Request("http://localhost/w/editor/?file=test.ts");
    const res = await widget_editor(req, tmpDir);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("test.ts");
    expect(html).toContain("CodeMirror");
    expect(html).toContain("const x = 1");
    expect(html).toContain("Save");
  });

  test("detects typescript language", async () => {
    const res = await widget_editor(new Request("http://localhost/w/editor/?file=test.ts"), tmpDir);
    const html = await res.text();
    expect(html).toContain("typescript");
  });

  test("detects css language", async () => {
    const res = await widget_editor(new Request("http://localhost/w/editor/?file=style.css"), tmpDir);
    const html = await res.text();
    expect(html).toContain("css");
  });

  test("shows error without file param", async () => {
    const res = await widget_editor(new Request("http://localhost/w/editor/"), tmpDir);
    const html = await res.text();
    expect(html).toContain("No file specified");
  });

  test("saves file content via POST", async () => {
    const form = new FormData();
    form.set("file", "test.ts");
    form.set("content", "const y = 2;");
    const req = new Request("http://localhost/w/editor/save", { method: "POST", body: form });
    const res = await widget_editor(req, tmpDir);
    const html = await res.text();
    expect(html).toContain("Saved");

    const saved = await Bun.file(join(tmpDir, "test.ts")).text();
    expect(saved).toBe("const y = 2;");
  });

  test("handles missing file on save", async () => {
    const form = new FormData();
    form.set("content", "hello");
    const req = new Request("http://localhost/w/editor/save", { method: "POST", body: form });
    const res = await widget_editor(req, tmpDir);
    const html = await res.text();
    expect(html).toContain("Missing");
  });

  test("handles new file", async () => {
    const res = await widget_editor(new Request("http://localhost/w/editor/?file=new.ts"), tmpDir);
    const html = await res.text();
    expect(html).toContain("new.ts");
    expect(html).toContain("CodeMirror");
  });

  test("save URL points to /w/editor/save", async () => {
    const res = await widget_editor(new Request("http://localhost/w/editor/?file=test.ts"), tmpDir);
    const html = await res.text();
    expect(html).toContain("/w/editor/save");
  });

  test("returns 404 for unknown path", async () => {
    const res = await widget_editor(new Request("http://localhost/w/editor/unknown"), tmpDir);
    expect(res.status).toBe(404);
  });
});
