import type { AgentTool } from "./agent_type_Tool.ts";
import { hyper_ui_run } from "./hyper_ui_run.ts";
import { hyper_ui_list } from "./hyper_ui_list.ts";

export function tool_hyper_ui(cwd: string): AgentTool {
  return {
    name: "hyper_ui",
    description: "Manage interactive HTML widgets. action=list to see available widgets, action=show to render a widget in chat. Widgets are .hyper_ui.ts/.py/.sh CGI scripts.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "show"], description: "list: show available widgets. show: render a widget." },
        name: { type: "string", description: "Widget name (for action=show)" },
      },
      required: ["action"],
    },
    execute: async (params: { action: string; name?: string }) => {
      if (params.action === "list") {
        const widgets = await hyper_ui_list(cwd);
        if (widgets.length === 0) {
          return { content: [{ type: "text", text: "No widgets found. Create a .hyper_ui.ts file to add one." }] };
        }
        const text = widgets.map((w) => `- ${w.name} (${w.file})`).join("\n");
        return { content: [{ type: "text", text }] };
      }

      if (params.action === "show") {
        if (!params.name) {
          return { content: [{ type: "text", text: "Error: name is required for action=show" }] };
        }

        const html = await hyper_ui_run(cwd, params.name, {
          method: "GET", path: "/", query: "", body: "",
        });

        // Check if it's an error
        if (html.includes("not found")) {
          return { content: [{ type: "text", text: `Widget "${params.name}" not found` }] };
        }

        const wrapped = `<div id="hyper-ui-${Bun.escapeHTML(params.name)}" data-entity="widget" data-id="${Bun.escapeHTML(params.name)}" class="border border-blue-200 bg-blue-50 rounded-lg p-4 my-2">${html}</div>`;
        return { content: [{ type: "html", html: wrapped }] };
      }

      return { content: [{ type: "text", text: `Unknown action: ${params.action}` }] };
    },
  };
}
