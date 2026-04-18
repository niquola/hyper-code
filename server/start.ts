import type { HtmlContent } from "../ai/type_Message.ts";
import type { Ctx } from "../agent/type_Ctx.ts";

export default async function start(appCtx: Ctx) {
  const routes = await appCtx.ui.router_buildRoutes("./ui", appCtx);
  const cwd = appCtx.cwd;

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
        return appCtx.ui.widget_editor(req, cwd);
      }

      // /ui/{name}/* — user CGI widgets from workspace
      if (url.pathname.startsWith("/ui/")) {
        return appCtx.hyper_ui.route(appCtx, cwd, req);
      }

      // POST /session/:id/fork
      const forkMatch = url.pathname.match(/^\/session\/([^/]+)\/fork\/?$/);
      if (forkMatch && req.method === "POST") {
        const parentId = decodeURIComponent(forkMatch[1]!);
        const db = appCtx.db;
        const parent = db.getSession(parentId);
        if (!parent) return new Response("Session not found", { status: 404 });
        const form = await req.formData().catch(() => null);
        const customOffset = form?.get("offset") ? Number(form.get("offset")) : null;
        const offset = customOffset ?? db.getFullMessages(parentId).length;
        const childId = db.createSession({
          title: `Fork: ${parent.title}`,
          parent: parentId,
          model: parent.model,
          offset,
        });
        const redirectUrl = `/session/${encodeURIComponent(childId)}/`;
        if (req.headers.get("HX-Request")) {
          return new Response(null, { status: 200, headers: { "HX-Redirect": redirectUrl } });
        }
        return new Response(null, { status: 302, headers: { Location: redirectUrl } });
      }

      // /session/:id/:action — per-session endpoints
      const actionMatch = url.pathname.match(/^\/session\/([^/]+)\/(chat|steer|abort|dispatch|stream|stats|rewind)\/?$/);
      if (actionMatch) {
        const sessionFilename = decodeURIComponent(actionMatch[1]!);
        const action = actionMatch[2]!;
        const session = await appCtx.chat.loadSessionByName(appCtx, sessionFilename);

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
            appCtx.db.rewindMessages(sessionFilename, index);
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
          const ctx = appCtx;
          const msgsBefore = session.messages.length;
          return appCtx.chat.sse(session, (onEvent) =>
            appCtx.agent.run(ctx, session, prompt, (event) => {
              onEvent(event);
              if (event.type === "agent_end") {
                const newMsgs = session.messages.slice(msgsBefore);
                if (newMsgs.length > 0) {
                  const db = appCtx.db;
                  for (const m of newMsgs) db.addMessage(sessionFilename, { role: m.role, content: m.role === "user" ? (typeof m.content === "string" ? m.content : JSON.stringify(m.content)) : JSON.stringify(m), timestamp: m.timestamp });
                }
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
          if (replaced) break;
        }

        let resolved = false;
        for (const [dialogId, resolve] of session.pendingDialogs) {
          resolve(text);
          resolved = true;
          break;
        }

        if (!resolved) {
          if (session.isStreaming) {
            session.steerQueue.push(`[User interaction from widget] ${text}`);
          } else {
            session.followUpQueue.push(`[User interaction from widget] ${text}`);
          }
        }

        return new Response(completedHtml, { headers: { "Content-Type": "text/html" } });
      }

      // /session/:id/ — serve session page
      const sessionMatch = url.pathname.match(/^\/session\/([^/]+)\/$/);
      if (sessionMatch && req.method === "GET") {
        const filename = decodeURIComponent(sessionMatch[1]!);
        const ctx = appCtx;
        const session = await appCtx.chat.loadSessionByName(appCtx, filename);
        appCtx.db.markRead(session.session_id, session.messages.length);
        const db = appCtx.db;
        const visibleMessages = db.getMessages(filename).map((r) => {
          if (r.role === "user") return { role: "user" as const, content: r.content, timestamp: r.timestamp };
          try { return JSON.parse(r.content); } catch { return { role: "user" as const, content: r.content, timestamp: r.timestamp }; }
        });
        const body = await appCtx.chat.view_page(appCtx, visibleMessages, session.session_id, session.isStreaming);
        const sessionRow = appCtx.db.getSession(filename);
        const parentRow = sessionRow?.parent ? appCtx.db.getSession(sessionRow.parent) : null;
        const sessionMeta = {
          sessionId: filename,
          parentId: sessionRow?.parent || undefined,
          parentTitle: parentRow?.title || undefined,
        };
        return new Response(appCtx.ui.layout_view_page(appCtx, "Hyper Code", body, session.model.name || session.model.id, sessionMeta), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // POST /repl — REPL endpoint
      if (url.pathname === "/repl" && req.method === "POST") {
        const handler = (globalThis as any).__repl;
        if (!handler) return Response.json({ error: "REPL not initialized" }, { status: 500 });
        try {
          const body = await req.json();
          return Response.json(await handler(body));
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      }

      return new Response("Not found", { status: 404 });
    },
  });

  await Bun.write(".port", String(server.port));
  console.log(`http://localhost:${server.port}`);
  return server;
}
