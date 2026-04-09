import type { AgentTool } from "./agent_type_Tool.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import type { Session } from "./chat_type_Session.ts";
import { getDb } from "./chat_db.ts";
import { agent_run } from "./agent_run.ts";

export function tool_subagent(
  loadSession: (filename: string) => Promise<Session>,
): AgentTool {
  return {
    name: "subagent",
    description: "Launch a sub-agent in a forked session. Inherits full conversation history (cached). Blocks until sub-agent calls subagent_report. User can observe/steer the sub-agent in its own session tab.",
    parameters: {
      type: "object",
      properties: {
        task: { type: "string", description: "Task description for the sub-agent. Be specific about what to do and what to report back." },
      },
      required: ["task"],
    },
    execute: async (ctx: Ctx, session: Session, params: { task: string }) => {
      const db = getDb();
      const savedCount = db.getMessageCount(session.filename);
      const childFilename = db.forkSession(session.filename, params.task, savedCount);

      const { promise, resolve } = Promise.withResolvers<string>();
      session.pendingDialogs.set(`subagent:${childFilename}`, resolve);

      session.emitHtml?.(`<div class="text-xs text-blue-500 border border-blue-200 rounded px-3 py-2 bg-blue-50 mb-2">Sub-agent started: ${Bun.escapeHTML(params.task.slice(0, 80))}</div>`);

      const childSession = await loadSession(childFilename);
      const taskWithInstructions = `[SUB-AGENT TASK] ${params.task}\n\nWhen you are done, you MUST call subagent_report({ result: "..." }) with a summary of what you accomplished. Do NOT skip this step.`;

      const msgsBefore = childSession.messages.length;
      agent_run(ctx, childSession, taskWithInstructions, (event) => {
        if (event.type === "agent_end") {
          const newMsgs = childSession.messages.slice(msgsBefore);
          if (newMsgs.length > 0) {
            for (const m of newMsgs) db.addMessage(childFilename, { role: m.role, content: m.role === "user" ? (typeof m.content === "string" ? m.content : JSON.stringify(m.content)) : JSON.stringify(m), timestamp: m.timestamp });
          }
        }
      }).catch((err) => console.error("[subagent]", err));

      const result = await promise;
      session.pendingDialogs.delete(`subagent:${childFilename}`);

      return { content: [{ type: "text", text: `Sub-agent report: ${result}` }] };
    },
  };
}
