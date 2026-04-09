import type { AgentTool } from "./agent_type_Tool.ts";
import type { Session } from "./chat_type_Session.ts";

export function tool_subagent_report(
  getSession: () => Session,
  findParent?: (childFilename: string) => Session | null,
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
    execute: async (params: { result: string }) => {
      const session = getSession();
      const key = `subagent:${session.filename}`;

      // Search all cached sessions for the one waiting for this subagent
      const parentSession = findParent?.(session.filename);
      if (parentSession) {
        const resolve = parentSession.pendingDialogs.get(key);
        if (resolve) resolve(params.result);
      }

      return {
        content: [{ type: "text", text: `Report sent: ${params.result}` }],
      };
    },
  };
}
