import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";

export function tool_subagent_report(
  findParent: (childFilename: string) => Session | null,
): AgentTool {
  return {
    name: "subagent_report",
    description: "Report results back to parent session. Only available in sub-agent sessions. Sends your result to the parent agent that launched you.",
    parameters: {
      type: "object",
      properties: {
        result: { type: "string", description: "Summary of what you accomplished. Be concise but complete." },
      },
      required: ["result"],
    },
    execute: async (ctx: Ctx, session: Session, params: { result: string }) => {
      const parentSession = findParent(session.session_id);
      if (parentSession) {
        const resolve = parentSession.pendingDialogs.get(`subagent:${session.session_id}`);
        if (resolve) resolve(params.result);
      }
      return { content: [{ type: "text", text: `Report sent: ${params.result}` }] };
    },
  };
}
