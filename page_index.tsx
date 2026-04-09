import { getDb } from "./chat_db.ts";

export default async function (req: Request) {
  const db = getDb();
  const sessions = db.listSessions();
  // Find latest non-empty session or create new
  const latest = sessions.find(s => db.getMessageCount(s.filename) > 0) || sessions[0];

  if (latest) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/session/${encodeURIComponent(latest.filename)}/` },
    });
  }

  // No sessions — create one
  const filename = db.createSession({});
  return new Response(null, {
    status: 302,
    headers: { Location: `/session/${encodeURIComponent(filename)}/` },
  });
}
