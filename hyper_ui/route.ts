
/**
 * Handle requests to /ui/{name}/{path...}
 * Runs the corresponding .hyper_ui.* CGI script
 */
export default async function hyper_ui_handleRequest(ctx: any, cwd: string, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/ui\/([^/]+)(\/.*)?$/);
  if (!match) {
    return new Response("Invalid widget path", { status: 400 });
  }

  const name = match[1]!;
  const pathInfo = match[2] || "/";

  // Check widget exists
  const widgets = await ctx.hyper_ui.list(cwd);
  const widget = widgets.find((w) => w.name === name);
  if (!widget) {
    return new Response(`Widget "${name}" not found`, { status: 404 });
  }

  const body = req.method === "POST" ? await req.text() : "";

  const html = await ctx.hyper_ui.run(cwd, name, {
    method: req.method,
    path: pathInfo,
    query: url.search.slice(1),
    body,
  });

  // Wrap in container div with hyper-ui class for default styles + htmx targeting
  const wrapped = `<div id="hyper-ui-${Bun.escapeHTML(name)}" data-entity="widget" data-id="${Bun.escapeHTML(name)}" class="hyper-ui">${html}</div>`;

  return new Response(wrapped, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
