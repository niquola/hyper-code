import { sessions, messageCache } from "./state.ts";

export default function chat_resetSessions(): void {
  sessions.clear();
  messageCache.clear();
}
