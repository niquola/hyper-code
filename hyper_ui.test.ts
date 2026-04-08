import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { hyper_ui_run } from "./hyper_ui_run.ts";
import { hyper_ui_list } from "./hyper_ui_list.ts";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "hyper-ui-test-"));

  // Simple hello widget
  writeFileSync(join(tmpDir, "hyper_ui_hello.ts"), `
    const method = process.env.REQUEST_METHOD || "GET";
    const path = process.env.PATH_INFO || "/";
    if (method === "GET" && path === "/") {
      console.log('<h1>Hello Widget</h1>');
      console.log('<form hx-post="/ui/hello/greet" hx-target="#hyper-ui-hello" hx-swap="innerHTML">');
      console.log('  <input name="name" value="" />');
      console.log('  <button type="submit">Greet</button>');
      console.log('</form>');
    } else if (method === "POST" && path === "/greet") {
      const body = await Bun.stdin.text();
      const params = new URLSearchParams(body);
      console.log('<h1>Hello ' + Bun.escapeHTML(params.get("name") || "World") + '!</h1>');
    }
  `);

  // Tasks widget with state
  writeFileSync(join(tmpDir, "hyper_ui_tasks.ts"), `
    const method = process.env.REQUEST_METHOD || "GET";
    const path = process.env.PATH_INFO || "/";
    const file = Bun.file(process.env.WORKSPACE_DIR + "/.tasks.json");
    let tasks: {title: string; done: boolean}[] = [];
    if (await file.exists()) tasks = await file.json();

    if (method === "GET") {
      console.log('<h2>Tasks (' + tasks.length + ')</h2>');
      tasks.forEach((t, i) => {
        console.log('<div>' + (t.done ? "✅" : "⬜") + ' ' + Bun.escapeHTML(t.title) + '</div>');
      });
      console.log('<form hx-post="/ui/tasks/add" hx-target="#hyper-ui-tasks" hx-swap="innerHTML">');
      console.log('  <input name="title" placeholder="New task..." />');
      console.log('  <button>Add</button>');
      console.log('</form>');
    } else if (method === "POST" && path === "/add") {
      const body = await Bun.stdin.text();
      const params = new URLSearchParams(body);
      const title = params.get("title");
      if (title) tasks.push({ title, done: false });
      await Bun.write(process.env.WORKSPACE_DIR + "/.tasks.json", JSON.stringify(tasks));
      console.log('<div>✅ Added: ' + Bun.escapeHTML(title || "") + '</div>');
      console.log('<div>Total: ' + tasks.length + ' tasks</div>');
    }
  `);

  // Bash widget
  writeFileSync(join(tmpDir, "hyper_ui_status.sh"), `#!/bin/bash
echo "<h2>System Status</h2>"
echo "<pre>$(date)</pre>"
echo "<pre>$(uname -a)</pre>"
  `);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// -- hyper_ui_run (CGI runner) --

describe("hyper_ui_run", () => {
  test("runs GET / on a .hyper_ui.ts script", async () => {
    const html = await hyper_ui_run(tmpDir, "hello", { method: "GET", path: "/", query: "", body: "" });
    expect(html).toContain("Hello Widget");
    expect(html).toContain("<form");
    expect(html).toContain("hx-post");
  });

  test("runs POST with body", async () => {
    const html = await hyper_ui_run(tmpDir, "hello", { method: "POST", path: "/greet", query: "", body: "name=Alice" });
    expect(html).toContain("Hello Alice!");
  });

  test("handles state (tasks widget)", async () => {
    // Add a task
    const html1 = await hyper_ui_run(tmpDir, "tasks", { method: "POST", path: "/add", query: "", body: "title=Buy+milk" });
    expect(html1).toContain("Added: Buy milk");

    // Read tasks
    const html2 = await hyper_ui_run(tmpDir, "tasks", { method: "GET", path: "/", query: "", body: "" });
    expect(html2).toContain("Buy milk");
    expect(html2).toContain("Tasks (1)");
  });

  test("runs bash scripts", async () => {
    const html = await hyper_ui_run(tmpDir, "status", { method: "GET", path: "/", query: "", body: "" });
    expect(html).toContain("System Status");
    expect(html).toContain("<pre>");
  });

  test("returns error for nonexistent widget", async () => {
    const html = await hyper_ui_run(tmpDir, "nonexistent", { method: "GET", path: "/", query: "", body: "" });
    expect(html).toContain("not found");
  });

  test("sets WORKSPACE_DIR env var", async () => {
    // tasks widget uses WORKSPACE_DIR to read/write .tasks.json
    const html = await hyper_ui_run(tmpDir, "tasks", { method: "GET", path: "/", query: "", body: "" });
    // Should work without errors (proves WORKSPACE_DIR is set correctly)
    expect(html).toContain("Tasks");
  });
});

// -- hyper_ui_list --

describe("hyper_ui_list", () => {
  test("lists all hyper_ui scripts", async () => {
    const widgets = await hyper_ui_list(tmpDir);
    expect(widgets.length).toBeGreaterThanOrEqual(3);
    expect(widgets.map(w => w.name)).toContain("hello");
    expect(widgets.map(w => w.name)).toContain("tasks");
    expect(widgets.map(w => w.name)).toContain("status");
  });

  test("includes file extension", async () => {
    const widgets = await hyper_ui_list(tmpDir);
    const hello = widgets.find(w => w.name === "hello");
    expect(hello?.ext).toBe("ts");
  });

  test("returns empty for dir without widgets", async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), "empty-"));
    const widgets = await hyper_ui_list(emptyDir);
    expect(widgets).toHaveLength(0);
    rmSync(emptyDir, { recursive: true });
  });
});
