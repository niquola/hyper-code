import { test, expect, describe } from "bun:test";

const PORT = await Bun.file(".port").text().then(Number);
const BASE = `http://localhost:${PORT}`;

describe("server routes", () => {
  test("GET / redirects to /session/:id/", async () => {
    const res = await fetch(`${BASE}/`, { redirect: "manual" });
    expect(res.status).toBe(302);
    const loc = res.headers.get("Location")!;
    expect(loc).toMatch(/\/session\/.+\/$/);
  });

  test("GET /session/:id/ renders chat page", async () => {
    // First get the session id from redirect
    const redir = await fetch(`${BASE}/`, { redirect: "manual" });
    const loc = redir.headers.get("Location")!;

    const res = await fetch(`${BASE}${loc}`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-page="chat"');
    expect(html).toContain("Hyper Code");
  });

  test("GET /sessions returns session list", async () => {
    const res = await fetch(`${BASE}/sessions`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("session-list");
  });

  test("GET /stats returns stats", async () => {
    const res = await fetch(`${BASE}/stats`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("nav-stats");
  });

  test("POST /chat without prompt redirects", async () => {
    const res = await fetch(`${BASE}/chat`, {
      method: "POST",
      body: new URLSearchParams({ prompt: "" }),
      redirect: "manual",
    });
    expect(res.status).toBe(302);
  });

  test("GET /session/new renders new session form", async () => {
    const res = await fetch(`${BASE}/session/new`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-page="new-session"');
  });
});
