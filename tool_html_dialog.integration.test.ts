import { test, expect, describe } from "bun:test";

const PORT = await Bun.file(".port").text().then(Number);
const BASE = `http://localhost:${PORT}`;

describe("html_dialog dispatch integration", () => {
  test("dialog form submits to /session/:id/dispatch", async () => {
    // Get current session
    const redir = await fetch(`${BASE}/`, { redirect: "manual" });
    const loc = redir.headers.get("Location")!;
    // loc = /session/xxx.jsonl/
    const sessionId = loc.match(/\/session\/([^/]+)\//)?.[1];
    expect(sessionId).toBeTruthy();

    // Simulate dispatch POST as if from dialog form
    const form = new FormData();
    form.set("text", "test response");
    const res = await fetch(`${BASE}/session/${sessionId}/dispatch`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("✓");
    expect(html).toContain("test response");
    // Should have HX-Trigger header
    expect(res.headers.get("HX-Trigger")).toBe("dispatch-sent");
  });

  test("dispatch with named fields", async () => {
    const redir = await fetch(`${BASE}/`, { redirect: "manual" });
    const loc = redir.headers.get("Location")!;
    const sessionId = loc.match(/\/session\/([^/]+)\//)?.[1];

    const form = new FormData();
    form.set("files", "a.ts");
    form.append("files", "b.ts");
    form.set("action", "delete");
    const res = await fetch(`${BASE}/session/${sessionId}/dispatch`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("✓");
  });

  test("dispatch with no fields returns 400", async () => {
    const redir = await fetch(`${BASE}/`, { redirect: "manual" });
    const loc = redir.headers.get("Location")!;
    const sessionId = loc.match(/\/session\/([^/]+)\//)?.[1];

    const res = await fetch(`${BASE}/session/${sessionId}/dispatch`, {
      method: "POST",
      body: new FormData(),
    });

    expect(res.status).toBe(400);
  });

  test("dialog HTML has correct structure", async () => {
    const { tool_html_dialog } = await import("./tool_html_dialog.ts");
    const t = tool_html_dialog();
    const result = await t.execute({
      title: "Pick files",
      html: '<label><input type="checkbox" name="f" value="a.ts"> a.ts</label>',
      submit_label: "Go",
    });

    const html = (result.content[0] as any).html;

    // Structure
    expect(html).toContain("<dialog");
    expect(html).toContain("data-widget-id=");
    expect(html).toContain("submitDialog");

    // Content
    expect(html).toContain("Pick files");
    expect(html).toContain('name="f"');
    expect(html).toContain("Go"); // submit label
    expect(html).toContain("Cancel");

    // Script checks open state
    expect(html).toContain("!d.open");
    expect(html).toContain("showModal");

    // onsubmit removes dialog
    expect(html).toContain("onsubmit");
    expect(html).toContain(".remove()");
  });

  test("dispatch URL resolves correctly from session page", async () => {
    // The form uses hx-post="dispatch" (relative)
    // On page /session/xxx.jsonl/ this should resolve to /session/xxx.jsonl/dispatch
    const { tool_html_dialog } = await import("./tool_html_dialog.ts");
    const t = tool_html_dialog();
    const result = await t.execute({ title: "Test", html: "" });
    const html = (result.content[0] as any).html;

    // Must be relative "dispatch" not absolute "/dispatch"
    expect(html).toContain("submitDialog");
    expect(html).not.toContain('action="/dispatch"');
  });
});
