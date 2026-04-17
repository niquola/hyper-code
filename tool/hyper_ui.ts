import hyper_ui_run from "../hyper_ui/run.ts";
import hyper_ui_list from "../hyper_ui/list.ts";
import widget_editor from "../ui/widget_editor.ts";

const BUILTIN_WIDGETS = ["editor"];

export const name = "hyper_ui";
export const description = "Show interactive HTML widgets in chat. Built-in: editor. Custom: hyper_ui_<name>.ts CGI scripts.";
export const parameters = {
  type: "object",
  properties: {
    action: { type: "string", enum: ["list", "show"], description: "list or show" },
    name: { type: "string", description: "Widget name" },
    query: { type: "string", description: "Query string e.g. 'file=server.ts'" },
  },
  required: ["action"],
};

export default async function hyper_ui(ctx: Ctx, session: any, params: { action: string; name?: string; query?: string }) {
  const cwd = ctx.cwd;

  if (params.action === "list") {
    const custom = await hyper_ui_list(cwd);
    const lines = ["Built-in widgets:", ...BUILTIN_WIDGETS.map(w => `- ${w} (built-in)`)];
    if (custom.length > 0) { lines.push("", "Custom widgets:"); for (const w of custom) lines.push(`- ${w.name} (${w.file})`); }
    return { content: [{ type: "text" as const, text: lines.join("\n") }] };
  }

  if (params.action === "show") {
    if (!params.name) return { content: [{ type: "text" as const, text: "Error: name is required for action=show" }] };

    let html: string;
    if (params.name === "editor") {
      const url = `http://localhost/w/editor/?${params.query || ""}`;
      const res = await widget_editor(new Request(url), cwd);
      html = await res.text();
    } else {
      html = await hyper_ui_run(cwd, params.name, { method: "GET", path: "/", query: params.query || "", body: "" });
      if (html.includes("not found")) return { content: [{ type: "text" as const, text: `Widget "${params.name}" not found` }] };
      html = `<div id="hyper-ui-${Bun.escapeHTML(params.name)}" data-entity="widget" data-id="${Bun.escapeHTML(params.name)}" class="hyper-ui">${html}</div>`;
    }
    return { content: [{ type: "html" as const, html }] };
  }

  return { content: [{ type: "text" as const, text: `Unknown action: ${params.action}` }] };
}
