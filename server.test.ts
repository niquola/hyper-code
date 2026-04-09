import { test, expect, describe } from "bun:test";

const PORT = await Bun.file(".port").text().then(Number);
const BASE = `http://localhost:${PORT}`;

function getSessionId(): Promise<string> {
  return fetch(`${BASE}/`, { redirect: "manual" })
    .then(r => r.headers.get("Location")!.match(/\/session\/([^/]+)\//)![1]!);
}

describe("server routes", () => {
  test("GET / redirects to /session/:id/", async () => {
    const res = await fetch(`${BASE}/`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toMatch(/\/session\/.+\/$/);
  });

  test("GET /session/:id/ renders chat page", async () => {
    const id = await getSessionId();
    const res = await fetch(`${BASE}/session/${id}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-page="chat"');
    expect(html).toContain('action="chat"');
  });

  test("GET /sessions returns session list", async () => {
    const res = await fetch(`${BASE}/sessions`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("session-list");
  });

  test("GET /session/new renders form", async () => {
    const res = await fetch(`${BASE}/session/new`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('data-page="new-session"');
  });
});

describe("per-session endpoints", () => {
  test("POST /session/:id/chat without prompt redirects", async () => {
    const id = await getSessionId();
    const res = await fetch(`${BASE}/session/${id}/chat`, {
      method: "POST",
      body: new URLSearchParams({ prompt: "" }),
      redirect: "manual",
    });
    expect(res.status).toBe(302);
  });

  test("POST /session/:id/chat with prompt returns SSE", async () => {
    const id = await getSessionId();
    const res = await fetch(`${BASE}/session/${id}/chat`, {
      method: "POST",
      body: new URLSearchParams({ prompt: "say ok" }),
    });
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  test("POST /session/:id/steer returns ok", async () => {
    const id = await getSessionId();
    const res = await fetch(`${BASE}/session/${id}/steer`, {
      method: "POST",
      body: new URLSearchParams({ prompt: "stop that" }),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  test("POST /session/:id/abort redirects", async () => {
    const id = await getSessionId();
    const res = await fetch(`${BASE}/session/${id}/abort`, {
      method: "POST",
      redirect: "manual",
    });
    expect(res.status).toBe(302);
  });

  test("GET /session/:id/stats returns stats HTML", async () => {
    const id = await getSessionId();
    const res = await fetch(`${BASE}/session/${id}/stats`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("nav-stats");
  });

  test("GET /session/:id/stream returns 204 when idle", async () => {
    // Create a fresh session that's definitely not streaming
    const createRes = await fetch(`${BASE}/session/create`, {
      method: "POST",
      body: new URLSearchParams({ title: "stream-test" }),
      redirect: "manual",
    });
    const loc = createRes.headers.get("Location")!;
    const freshId = loc.match(/\/session\/([^/]+)\//)![1]!;
    const res = await fetch(`${BASE}/session/${freshId}/stream`);
    expect(res.status).toBe(204);
  });

  test("POST /session/:id/dispatch with text returns HTML", async () => {
    const id = await getSessionId();
    const res = await fetch(`${BASE}/session/${id}/dispatch`, {
      method: "POST",
      body: new URLSearchParams({ text: "confirmed" }),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("✓");
  });

  test("POST /session/:id/dispatch without text returns 400", async () => {
    const id = await getSessionId();
    const res = await fetch(`${BASE}/session/${id}/dispatch`, {
      method: "POST",
      body: new FormData(),
    });
    expect(res.status).toBe(400);
  });
});
