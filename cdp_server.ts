// CDP proxy server — bridges HTTP POST to Chrome DevTools Protocol WebSocket.
// Usage: CDP_PORT=2230 CDP_CHROME_PORT=9223 bun cdp_server.ts
//
// Launches Chrome with remote debugging, proxies CDP commands via HTTP:
//   POST /s/<session> → forwards JSON to Chrome DevTools WebSocket, returns result

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";

const CDP_PORT = Number(process.env.CDP_PORT || 2230);
const CHROME_PORT = Number(process.env.CDP_CHROME_PORT || 9223);
const PROFILE_DIR = process.env.CDP_PROFILE || ".chrome-profile";

// Find Chrome binary
function findChrome(): string {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "chromium",
  ];
  for (const c of candidates) {
    try {
      if (c.startsWith("/") && existsSync(c)) return c;
    } catch {}
  }
  return candidates[0]!;
}

// Launch Chrome
if (!existsSync(PROFILE_DIR)) mkdirSync(PROFILE_DIR, { recursive: true });

const chrome = spawn(findChrome(), [
  `--remote-debugging-port=${CHROME_PORT}`,
  `--user-data-dir=${PROFILE_DIR}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-features=Translate",
  "about:blank",
], { stdio: "ignore", detached: false });

chrome.on("error", (err) => console.error("Chrome launch failed:", err.message));

// Wait for Chrome to be ready
async function waitForChrome(maxWait = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/version`);
      if (res.ok) return;
    } catch {}
    await Bun.sleep(200);
  }
  throw new Error("Chrome did not start");
}

await waitForChrome();
console.log(`Chrome ready on port ${CHROME_PORT}`);

// Track WebSocket connections per session (tab)
const sessions = new Map<string, { ws: WebSocket; targetId: string }>();

async function getSession(name: string): Promise<{ ws: WebSocket; targetId: string }> {
  const existing = sessions.get(name);
  if (existing && existing.ws.readyState === WebSocket.OPEN) return existing;

  // List targets
  const res = await fetch(`http://127.0.0.1:${CHROME_PORT}/json`);
  const targets = await res.json() as any[];

  // Find or create a page target
  let target = targets.find((t: any) => t.type === "page" && t.title !== "about:blank");
  if (!target) {
    target = targets.find((t: any) => t.type === "page");
  }
  if (!target) {
    // Create new tab
    const newRes = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new`);
    target = await newRes.json();
  }

  const wsUrl = target.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);

  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = (e) => reject(e);
  });

  const session = { ws, targetId: target.id };
  sessions.set(name, session);
  return session;
}

let msgId = 1;

async function sendCommand(sessionName: string, method: string, params: any = {}): Promise<any> {
  const { ws } = await getSession(sessionName);
  const id = msgId++;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("CDP timeout")), 30_000);

    const handler = (event: MessageEvent) => {
      const data = JSON.parse(event.data as string);
      if (data.id === id) {
        clearTimeout(timeout);
        ws.removeEventListener("message", handler);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      }
    };

    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

// HTTP server
Bun.serve({
  port: CDP_PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/s\/(.+)$/);

    if (!match || req.method !== "POST") {
      return new Response("POST /s/<session> with {method, params}", { status: 400 });
    }

    const sessionName = match[1]!;
    const body: any = await req.json();

    try {
      const result = await sendCommand(sessionName, body.method, body.params || {});
      return Response.json(result);
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  },
});

console.log(`CDP server on http://localhost:${CDP_PORT}`);

// Cleanup
process.on("SIGINT", () => { chrome.kill(); process.exit(); });
process.on("SIGTERM", () => { chrome.kill(); process.exit(); });
