import type { AgentTool } from "./agent_type_Tool.ts";

let widgetCounter = 0;

export function tool_render_html(): AgentTool {
  return {
    name: "render_html",
    description: "Render HTML inline in chat. Static (tables, reports) or interactive (forms with dispatch). Interactive widgets collapse to result in history after user responds.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "HTML to render. Wrapped in .hyper-ui container with default styles." },
        interactive: { type: "boolean", description: "If true, widget has dispatch forms. After user responds, collapses in history. Default: false." },
      },
      required: ["html"],
    },
    execute: async (params: { html: string; interactive?: boolean }) => {
      if (params.interactive) {
        const id = `w-${Date.now()}-${++widgetCounter}`;
        // Wrap with widget ID so dispatch can find and replace it
        const html = `<div data-widget-id="${id}">${params.html}</div>`;
        return { content: [{ type: "html", html }] };
      }
      return { content: [{ type: "html", html: params.html }] };
    },
  };
}
