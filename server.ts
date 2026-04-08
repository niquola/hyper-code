import { router_buildRoutes } from "./router_buildRoutes.ts";
import { hyper_ui_handleRequest } from "./hyper_ui_route.ts";
import { widget_editor } from "./widget_editor.ts";
import { chat_getCtx } from "./chat_ctx.ts";
import { agent_run } from "./agent_run.ts";

const routes = await router_buildRoutes(".");
const cwd = process.cwd();

const server = Bun.serve({
  port: 0,
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

    // /dispatch — widget → agent feedback
    if (url.pathname === "/dispatch" && req.method === "POST") {
      const form = await req.formData();
      const text = form.get("text") as string || [...form.entries()].map(([k, v]) => `${k}: ${v}`).join("\n");
      if (!text.trim()) return new Response("empty", { status: 400 });

      const ctx = await chat_getCtx();
      // Run agent in background with the dispatch message
      agent_run(ctx, `[User interaction from widget] ${text}`, () => {});
      return new Response(
        `<div class="text-xs text-green-600 py-1">✓ Sent to agent</div>`,
        { headers: { "Content-Type": "text/html" } },
      );
    }

    return new Response("Not found", { status: 404 });
  },
});

await Bun.write(".port", String(server.port));
console.log(`http://localhost:${server.port}`);
