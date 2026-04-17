// CDP proxy server — bridges HTTP POST to Chrome DevTools Protocol WebSocket.
// Usage: CDP_PORT=2230 CDP_CHROME_PORT=9223 bun cdp_server.ts

import { cdp_createCtx } from "./createCtx.ts";
import { cdp_start } from "./start.ts";
import { cdp_send } from "./send.ts";

const ctx = cdp_createCtx({
  cdpPort: Number(process.env.CDP_PORT || 2230),
  chromePort: Number(process.env.CDP_CHROME_PORT || 9223),
  profileDir: process.env.CDP_PROFILE || ".chrome-profile",
});

const { chrome } = await cdp_start(ctx);
console.log(`Chrome ready on port ${ctx.chromePort}`);

Bun.serve({
  port: ctx.cdpPort,
  async fetch(req) {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/s\/(.+)$/);

    if (!match || req.method !== "POST") {
      return new Response("POST /s/<session> with {method, params}", { status: 400 });
    }

    const sessionName = match[1]!;
    const body: any = await req.json();

    try {
      const result = await cdp_send(ctx, sessionName, body.method, body.params || {});
      return Response.json(result);
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  },
});

console.log(`CDP server on http://localhost:${ctx.cdpPort}`);

process.on("SIGINT", () => { chrome.kill(); process.exit(); });
process.on("SIGTERM", () => { chrome.kill(); process.exit(); });
