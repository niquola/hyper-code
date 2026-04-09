import type { AgentTool } from "./agent_type_Tool.ts";
import type { Session } from "./chat_type_Session.ts";
import type { Ctx } from "./agent_type_Ctx.ts";
import { chat_sessionFork, chat_sessionAppend } from "./chat_session.ts";
import { agent_run } from "./agent_run.ts";

export function tool_subagent(
  getSession: () => Session,
  getCtxAndRun: () => Promise<{ ctx: Ctx; loadSession: (filename: string) => Promise<Session> }>,
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
    execute: async (params: { task: string }) => {
      const parentSession = getSession();

      // Fork session
      const childFilename = await chat_sessionFork(parentSession.filename, params.task);

      // Create promise that subagent_report will resolve
      const { promise, resolve } = Promise.withResolvers<string>();
      parentSession.pendingDialogs.set(`subagent:${childFilename}`, resolve);

      // Notify parent SSE
      parentSession.emitHtml?.(`<div class="text-xs text-blue-500 border border-blue-200 rounded px-3 py-2 bg-blue-50 mb-2">Sub-agent started: ${Bun.escapeHTML(params.task.slice(0, 80))}</div>`);

      // Load child session and run agent
      const { ctx, loadSession } = await getCtxAndRun();
      const childSession = await loadSession(childFilename);

      const taskWithInstructions = `[SUB-AGENT TASK] ${params.task}

When you are done, you MUST call subagent_report({ result: "..." }) with a summary of what you accomplished. This sends your result back to the parent agent. Do NOT skip this step.`;

      const msgsBefore = childSession.messages.length;
      agent_run(ctx, childSession, taskWithInstructions, (event) => {
        if (event.type === "agent_end") {
          const newMsgs = childSession.messages.slice(msgsBefore);
          if (newMsgs.length > 0) chat_sessionAppend(childFilename, ...newMsgs);
        }
      }).catch((err) => console.error("[subagent]", err));

      // Block until report
      const result = await promise;
      parentSession.pendingDialogs.delete(`subagent:${childFilename}`);

      return { content: [{ type: "text", text: `Sub-agent report: ${result}` }] };
    },
  };
}
