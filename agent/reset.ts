import type { Session } from "../chat/type_Session.ts";

export default function agent_reset(session: Session): void {
  session.abortController?.abort();
  session.messages = [];
  session.isStreaming = false;
  session.abortController = null;
  session.steerQueue = [];
  session.followUpQueue = [];
  session.sseListeners.clear();
  session.pendingDialogs.clear();
}
