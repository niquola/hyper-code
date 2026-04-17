import type { Session } from "../chat/type_Session.ts";

export default function agent_abort(session: Session): void {
  session.abortController?.abort();
}
