
export const name = "subagent";
export const description = "Launch a sub-agent in a forked session. Inherits full conversation history. Blocks until sub-agent calls subagent_report.";
export const parameters = {
  type: "object",
  properties: {
    task: { type: "string", description: "Task description for the sub-agent." },
  },
  required: ["task"],
};

export default async function subagent(ctx: Ctx, session: any, params: { task: string }) {
  const db = ctx.db;
  const savedCount = db.getMessageCount(session.session_id);
  const childFilename = db.forkSession(session.session_id, params.task, savedCount);

  const { promise, resolve } = Promise.withResolvers<string>();
  session.pendingDialogs.set(`subagent:${childFilename}`, resolve);

  session.emitHtml?.(`<div class="text-xs text-blue-500 border border-blue-200 rounded px-3 py-2 bg-blue-50 mb-2">Sub-agent started: ${Bun.escapeHTML(params.task.slice(0, 80))}</div>`);

  // loadSession must be available on ctx or passed in — for now use dynamic import
  // via ctx
  const childSession = await ctx.chat.loadSessionByName(ctx, childFilename);
  const taskWithInstructions = `[SUB-AGENT TASK] ${params.task}\n\nWhen done, call subagent_report({ result: "..." }).`;

  const msgsBefore = childSession.messages.length;
  ctx.agent.run(ctx, childSession, taskWithInstructions, (event) => {
    if (event.type === "agent_end") {
      const newMsgs = childSession.messages.slice(msgsBefore);
      for (const m of newMsgs) db.addMessage(childFilename, { role: m.role, content: m.role === "user" ? (typeof m.content === "string" ? m.content : JSON.stringify(m.content)) : JSON.stringify(m), timestamp: m.timestamp });
    }
  }).catch((err) => console.error("[subagent]", err));

  const result = await promise;
  session.pendingDialogs.delete(`subagent:${childFilename}`);

  return { content: [{ type: "text" as const, text: `Sub-agent report: ${result}` }] };
}
