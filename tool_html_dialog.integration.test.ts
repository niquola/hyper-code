import { test, expect, describe } from "bun:test";

const PORT = await Bun.file(".port").text().then(Number);
const BASE = `http://localhost:${PORT}`;

describe("html_dialog dispatch integration", () => {
  test("dispatch resolves pending dialog and returns HTML", async () => {
    const redir = await fetch(`${BASE}/`, { redirect: "manual" });
    const loc = redir.headers.get("Location")!;
    const sessionId = loc.match(/\/session\/([^/]+)\//)?.[1];
    expect(sessionId).toBeTruthy();

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
  });

  test("dispatch with named fields", async () => {
    const redir = await fetch(`${BASE}/`, { redirect: "manual" });
    const loc = redir.headers.get("Location")!;
    const sessionId = loc.match(/\/session\/([^/]+)\//)?.[1];

    const form = new FormData();
    form.set("files", "a.ts");
    form.append("files", "b.ts");
    const res = await fetch(`${BASE}/session/${sessionId}/dispatch`, {
      method: "POST",
      body: form,
    });

    expect(res.status).toBe(200);
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
});
