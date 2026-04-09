import type { HtmlContent } from "./ai_type_Message.ts";
import { router_buildRoutes } from "./router_buildRoutes.ts";
import { hyper_ui_handleRequest } from "./hyper_ui_route.ts";
import { widget_editor } from "./widget_editor.ts";
import { chat_getCtx, chat_getSession, chat_loadSessionByName } from "./chat_ctx.ts";
import { chat_createSSEStream } from "./chat_sse.ts";
import { chat_sessionRewrite, chat_sessionAppend, chat_sessionLoadRaw } from "./chat_session.ts";
import { agent_run } from "./agent_run.ts";
import { layout_view_page } from "./layout_view_page.tsx";
import { chat_view_page } from "./chat_view_page.tsx";
import { chat_markRead } from "./chat_unread.ts";

const routes = await router_buildRoutes(".");
const cwd = process.cwd();

const savedPort = await Bun.file(".port").text().catch(() => "");
const port = savedPort.trim() ? Number(savedPort.trim()) : 0;

const server = Bun.serve({
  port,
  idleTimeout: 255,
  routes,
  async fetch(req) {
    const url = new URL(req.url);

    // /w/editor/* — built-in editor widget
    if (url.pathname.startsWith("/w/editor")) {
      return widget_editor(req, cwd);
    }

    // /ui/{name}/* — user CGI widgets from workspace
    if (url.pathname.startsWith("/ui/")) {
      return hyper_ui_handleRequest(cwd, req);
    }

    // /session/:id/:action — per-session endpoints
    const actionMatch = url.pathname.match(/^\/session\/([^/]+)\/(chat|steer|abort|dispatch|stream|stats|rewind)\/?$/);
    if (actionMatch) {
      const sessionFilename = decodeURIComponent(actionMatch[1]!);
      const action = actionMatch[2]!;
      const session = await chat_loadSessionByName(sessionFilename);

      // GET /session/:id/stream — SSE reconnect
      if (action === "stream" && req.method === "GET") {
        if (!session.isStreaming) return new Response("not streaming", { status: 204 });
        const encoder = new TextEncoder();
        let closed = false;
        const stream = new ReadableStream({
          start(ctrl) {
            const listener = (html: string) => {
              if (closed) return;
              try { const lines = html.split("\n").map((l: string) => `data: ${l}`).join("\n"); ctrl.enqueue(encoder.encode(`${lines}\n\n`)); } catch { closed = true; session.sseListeners.delete(listener); }
            };
            session.sseListeners.add(listener);
            req.signal.addEventListener("abort", () => { closed = true; session.sseListeners.delete(listener); try { ctrl.close(); } catch {} });
          },
        });
        return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" } });
      }

      // GET /session/:id/stats
      if (action === "stats" && req.method === "GET") {
        const assistantMessages = session.messages.filter((m) => m.role === "assistant") as any[];
        let totalTokens = 0, totalCost = 0;
        for (const msg of assistantMessages) { totalTokens += msg.usage.totalTokens; totalCost += msg.usage.cost.total; }
        if (assistantMessages.length === 0) return new Response(`<span id="nav-stats" data-entity="stats" class="text-xs text-gray-400"></span>`, { headers: { "Content-Type": "text/html" } });
        const costStr = totalCost > 0 ? ` · $${totalCost.toFixed(4)}` : "";
        return new Response(`<span id="nav-stats" data-entity="stats" class="text-xs text-gray-400">${totalTokens} tok${costStr}</span>`, { headers: { "Content-Type": "text/html" } });
      }

      // GET /session/:id/rewind?index=N
      if (action === "rewind" && req.method === "GET") {
        const index = parseInt(url.searchParams.get("index") || "0", 10);
        if (index >= 0 && index < session.messages.length) {
          session.messages = session.messages.slice(0, index);
          chat_sessionRewrite(sessionFilename, session.messages);
        }
        return new Response(null, { status: 302, headers: { Location: `/session/${encodeURIComponent(sessionFilename)}/` } });
      }

      // POST /session/:id/chat
      if (action === "chat" && req.method === "POST") {
        const form = await req.formData();
        const prompt = form.get("prompt") as string;
        if (!prompt?.trim()) return new Response(null, { status: 302, headers: { Location: `/session/${encodeURIComponent(sessionFilename)}/` } });
        if (session.isStreaming) {
          session.followUpQueue.push(prompt.trim());
          return new Response(JSON.stringify({ queued: "followUp" }), { headers: { "Content-Type": "application/json" } });
        }
        const ctx = await chat_getCtx();
        const msgsBefore = session.messages.length;
        return chat_createSSEStream(session, (onEvent) =>
          agent_run(ctx, session, prompt, (event) => {
            onEvent(event);
            if (event.type === "agent_end") {
              const newMsgs = session.messages.slice(msgsBefore);
              if (newMsgs.length > 0) chat_sessionAppend(sessionFilename, ...newMsgs);
            }
          }),
        );
      }

      // POST /session/:id/steer
      if (action === "steer" && req.method === "POST") {
        const form = await req.formData();
        const prompt = form.get("prompt") as string;
        if (prompt?.trim()) session.steerQueue.push(prompt.trim());
        return new Response("ok");
      }

      // POST /session/:id/abort
      if (action === "abort" && req.method === "POST") {
        session.abortController?.abort();
        return new Response(null, { status: 302, headers: { Location: `/session/${encodeURIComponent(sessionFilename)}/` } });
      }

      // POST /session/:id/dispatch
      if (action !== "dispatch" || req.method !== "POST") return new Response("Not found", { status: 404 });
      const dForm = await req.formData();
      const text = dForm.get("text") as string || [...dForm.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
      if (!text.trim()) return new Response("empty", { status: 400 });

      // Replace last interactive widget HTML with completed state
      const completedHtml = `<div class="text-xs text-gray-500 border border-gray-200 rounded px-3 py-2 bg-gray-50">✓ ${Bun.escapeHTML(text)}</div>`;
      for (let i = session.messages.length - 1; i >= 0; i--) {
        const msg = session.messages[i]!;
        if (msg.role !== "toolResult") continue;
        let replaced = false;
        for (const c of msg.content) {
          if (c.type === "html" && (c as HtmlContent).html.includes("data-widget-id")) {
            (c as HtmlContent).html = completedHtml;
            replaced = true;
            break;
          }
        }
        if (replaced) {
          chat_sessionRewrite(session.filename, session.messages);
          break;
        }
      }

      // Resolve pending dialog if any (blocking tool awaits this)
      let resolved = false;
      for (const [dialogId, resolve] of session.pendingDialogs) {
        resolve(text);
        resolved = true;
        break; // resolve first pending dialog
      }

      // If no pending dialog, inject as steer/follow-up
      if (!resolved) {
        if (session.isStreaming) {
          session.steerQueue.push(`[User interaction from widget] ${text}`);
        } else {
          session.followUpQueue.push(`[User interaction from widget] ${text}`);
        }
      }

      return new Response(completedHtml, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // /session/:id/ (trailing slash) — serve session page
    const sessionMatch = url.pathname.match(/^\/session\/([^/]+)\/$/);
    if (sessionMatch && req.method === "GET") {
      const filename = decodeURIComponent(sessionMatch[1]!);
      const ctx = await chat_getCtx();
      const session = await chat_loadSessionByName(filename);
      chat_markRead(session.filename, session.messages.length);
      // Render only own messages (not parent chain) for UI
      const visibleMessages = await chat_sessionLoadRaw(filename);
      const body = await chat_view_page(visibleMessages, session.filename, session.isStreaming);
      return new Response(layout_view_page("Hyper Code", body, ctx.model.name || ctx.model.id), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }


    return new Response("Not found", { status: 404 });
  },
});

await Bun.write(".port", String(server.port));
console.log(`http://localhost:${server.port}`);
