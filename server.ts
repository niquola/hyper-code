import { router_buildRoutes } from "./router_buildRoutes.ts";
import { hyper_ui_handleRequest } from "./hyper_ui_route.ts";
import { widget_editor } from "./widget_editor.ts";
import { chat_getCtx, chat_getSession, chat_loadSessionByName, chat_switchSession } from "./chat_ctx.ts";
import { chat_createSSEStream } from "./chat_sse.ts";
import { chat_sessionRewrite, chat_sessionAppend } from "./chat_session.ts";
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

    // /session/:id/dispatch — widget → agent feedback
    const dispatchMatch = url.pathname.match(/^\/session\/([^/]+)\/dispatch\/?$/);
    if (dispatchMatch && req.method === "POST") {
      const sessionFilename = decodeURIComponent(dispatchMatch[1]!);
      const form = await req.formData();
      const text = form.get("text") as string || [...form.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
      if (!text.trim()) return new Response("empty", { status: 400 });

      const ctx = await chat_getCtx();
      const session = await chat_loadSessionByName(sessionFilename);

      // Replace last interactive widget HTML with completed state
      const completedHtml = `<div class="text-xs text-gray-500 border border-gray-200 rounded px-3 py-2 bg-gray-50">✓ ${Bun.escapeHTML(text)}</div>`;
      for (let i = session.messages.length - 1; i >= 0; i--) {
        const msg = session.messages[i]!;
        if (msg.role !== "toolResult") continue;
        let replaced = false;
        for (const c of msg.content) {
          if (c.type === "html" && (c as any).html.includes("data-widget-id")) {
            (c as any).html = completedHtml;
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
      await chat_switchSession(filename);
      const ctx = await chat_getCtx();
      const session = await chat_getSession();
      chat_markRead(session.filename, session.messages.length);
      const body = await chat_view_page(session.messages, session.filename, session.isStreaming);
      return new Response(layout_view_page("Hyper Code", body, ctx.model.name || ctx.model.id), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

await Bun.write(".port", String(server.port));
console.log(`http://localhost:${server.port}`);
