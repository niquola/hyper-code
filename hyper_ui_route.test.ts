import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { hyper_ui_handleRequest } from "./hyper_ui_route.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let tmpDir: string;

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "hyper-route-test-"));
  writeFileSync(join(tmpDir, "counter.hyper_ui.ts"), `
    const method = process.env.REQUEST_METHOD || "GET";
    const path = process.env.PATH_INFO || "/";
    if (method === "GET") {
      console.log('<div data-entity="widget" data-status="active">');
      console.log('  <span data-role="content">Counter Widget</span>');
      console.log('</div>');
    }
  `);
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("hyper_ui_handleRequest", () => {
  test("handles GET /ui/counter/", async () => {
    const req = new Request("http://localhost/ui/counter/");
    const res = await hyper_ui_handleRequest(tmpDir, req);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Counter Widget");
    expect(html).toContain('id="hyper-ui-counter"');
  });

  test("returns HTML content type", async () => {
    const req = new Request("http://localhost/ui/counter/");
    const res = await hyper_ui_handleRequest(tmpDir, req);
    expect(res.headers.get("Content-Type")).toContain("text/html");
  });

  test("handles subpaths", async () => {
    const req = new Request("http://localhost/ui/counter/sub/path");
    const res = await hyper_ui_handleRequest(tmpDir, req);
    expect(res.status).toBe(200);
  });

  test("returns 404 for unknown widget", async () => {
    const req = new Request("http://localhost/ui/nonexistent/");
    const res = await hyper_ui_handleRequest(tmpDir, req);
    expect(res.status).toBe(404);
  });

  test("handles POST with body", async () => {
    const req = new Request("http://localhost/ui/counter/action", {
      method: "POST",
      body: "key=value",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const res = await hyper_ui_handleRequest(tmpDir, req);
    expect(res.status).toBe(200);
  });

  test("wraps output in container div", async () => {
    const req = new Request("http://localhost/ui/counter/");
    const res = await hyper_ui_handleRequest(tmpDir, req);
    const html = await res.text();
    expect(html).toContain('<div id="hyper-ui-counter"');
  });
});
