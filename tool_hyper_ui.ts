import type { AgentTool } from "./agent_type_Tool.ts";
import { hyper_ui_run } from "./hyper_ui_run.ts";
import { hyper_ui_list } from "./hyper_ui_list.ts";
import { widget_editor } from "./widget_editor.ts";

const BUILTIN_WIDGETS = ["editor"];

export function tool_hyper_ui(cwd: string): AgentTool {
  return {
    name: "hyper_ui",
    description: "Show interactive HTML widgets in chat. Built-in: editor (query: file=path). Custom: hyper_ui_<name>.ts CGI scripts in workspace.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "show"], description: "list: show available widgets. show: render a widget." },
        name: { type: "string", description: "Widget name. Built-in: 'editor'. Or custom hyper_ui_<name>.ts" },
        query: { type: "string", description: "Query string. E.g. 'file=server.ts' for editor" },
      },
      required: ["action"],
    },
    execute: async (params: { action: string; name?: string; query?: string }) => {
      if (params.action === "list") {
        const custom = await hyper_ui_list(cwd);
        const lines = [
          "Built-in widgets:",
          ...BUILTIN_WIDGETS.map((w) => `- ${w} (built-in)`),
        ];
        if (custom.length > 0) {
          lines.push("", "Custom widgets:");
          for (const w of custom) lines.push(`- ${w.name} (${w.file})`);
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      if (params.action === "show") {
        if (!params.name) {
          return { content: [{ type: "text", text: "Error: name is required for action=show" }] };
        }

        let html: string;

        // Built-in widgets: serve directly
        if (params.name === "editor") {
          const url = `http://localhost/w/editor/?${params.query || ""}`;
          const res = await widget_editor(new Request(url), cwd);
          html = await res.text();
        } else {
          // Custom CGI widget
          html = await hyper_ui_run(cwd, params.name, {
            method: "GET", path: "/", query: params.query || "", body: "",
          });
          if (html.includes("not found")) {
            return { content: [{ type: "text", text: `Widget "${params.name}" not found` }] };
          }
          html = `<div id="hyper-ui-${Bun.escapeHTML(params.name)}" data-entity="widget" data-id="${Bun.escapeHTML(params.name)}" class="hyper-ui">${html}</div>`;
        }

        return { content: [{ type: "html", html }] };
      }

      return { content: [{ type: "text", text: `Unknown action: ${params.action}` }] };
    },
  };
}
