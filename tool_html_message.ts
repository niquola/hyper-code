import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";

export function tool_html_message(): AgentTool {
  return {
    name: "html_message",
    description: "Show static HTML inline in chat. Use for tables, reports, status badges, results. Not interactive — for user input use html_dialog instead.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "HTML to render. Wrapped in .hyper-ui container with default styles." },
      },
      required: ["html"],
    },
    execute: async (ctx: Ctx, session: Session, params: { html: string }) => {
      return { content: [{ type: "html", html: params.html }] };
    },
  };
}
