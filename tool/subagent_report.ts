export const name = "subagent_report";
export const description = "Report results back to parent session. Only available in sub-agent sessions.";
export const parameters = {
  type: "object",
  properties: {
    result: { type: "string", description: "Summary of what you accomplished." },
  },
  required: ["result"],
};

export default async function subagent_report(ctx: Ctx, session: any, params: { result: string }) {
  // Find parent session that has a pending dialog for this child
  // This requires access to all sessions — use ctx.state.sessions or dynamic import
  // via ctx
  const parentSession = ctx.chat.findParentSession(ctx, session.session_id);
  if (parentSession) {
    const resolve = parentSession.pendingDialogs.get(`subagent:${session.session_id}`);
    if (resolve) resolve(params.result);
  }
  return { content: [{ type: "text" as const, text: `Report sent: ${params.result}` }] };
}
