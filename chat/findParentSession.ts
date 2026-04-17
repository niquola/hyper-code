import type { Session } from "./type_Session.ts";
import { sessions } from "./state.ts";

export default function chat_findParentSession(childFilename: string): Session | null {
  for (const [, sess] of sessions) {
    if (sess.pendingDialogs.has(`subagent:${childFilename}`)) return sess;
  }
  return null;
}
