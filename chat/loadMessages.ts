import type { Message } from "../ai/type_Message.ts";

export type MessageRow = { role: string; content: string; timestamp: number };

export function rowToMessage(row: MessageRow): Message {
  if (row.role === "user") {
    return { role: "user", content: row.content, timestamp: row.timestamp };
  }
  try {
    return JSON.parse(row.content);
  } catch {
    return { role: "user", content: row.content, timestamp: row.timestamp };
  }
}

export type SessionInfo = { parent: string | null; offset: number | null };

/**
 * Build full message array for a session by chaining parent messages.
 *
 * Pure function — all data passed explicitly:
 *   - sessions: sessionId → { parent, offset }
 *   - messages: sessionId → own MessageRow[]
 *   - cache: sessionId → already-computed Message[] (mutated: populated lazily)
 */
export default function chat_loadMessages(
  sessionId: string,
  sessions: (id: string) => SessionInfo | null,
  messages: (id: string) => MessageRow[],
  cache: Map<string, Message[]>,
): Message[] {
  if (cache.has(sessionId)) return cache.get(sessionId)!;

  const info = sessions(sessionId);
  if (!info) return [];

  let result: Message[];

  if (info.parent) {
    const parentMsgs = chat_loadMessages(info.parent, sessions, messages, cache);
    const limited = info.offset != null ? parentMsgs.slice(0, info.offset) : parentMsgs;
    const own = messages(sessionId).map(rowToMessage);
    result = [...limited, ...own];
  } else {
    result = messages(sessionId).map(rowToMessage);
  }

  cache.set(sessionId, result);
  return result;
}
