import type { Session } from "./type_Session.ts";

export default function chat_findParentSession(ctx: any, childFilename: string): Session | null {
  const { sessions } = ctx.state.chat;
  for (const [, sess] of sessions) {
    if (sess.pendingDialogs.has(`subagent:${childFilename}`)) return sess;
  }
  return null;
}
