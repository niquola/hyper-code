import type { AgentTool } from "./agent_type_Tool.ts";

export function tool_render_html(): AgentTool {
  return {
    name: "render_html",
    description: "Render interactive HTML inline in chat. Use for forms, tables, buttons, charts. htmx attributes work. Use hx-post=\"/dispatch\" to send user interaction back to you.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "HTML to render. Wrapped in .hyper-ui container with default styles." },
      },
      required: ["html"],
    },
    execute: async (params: { html: string }) => {
      return { content: [{ type: "html", html: params.html }] };
    },
  };
}
