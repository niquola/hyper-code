import type { Session } from "../chat/type_Session.ts";

export function agent_abort(session: Session): void {
  session.abortController?.abort();
}
