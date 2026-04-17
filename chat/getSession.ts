import type { Session } from "./type_Session.ts";
import { getCtx } from "./state.ts";

export default async function chat_getSession(): Promise<Session> {
  const ctx = getCtx();
  const db = ctx.db;
  const list = db.listSessions();
  const latest = list.find((s: any) => db.getMessageCount(s.session_id) > 0) || list[0];
  if (latest) return ctx.chat.loadSessionByName(latest.session_id);
  const filename = db.createSession({});
  return ctx.chat.loadSessionByName(filename);
}
