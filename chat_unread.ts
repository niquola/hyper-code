// Track last-seen message count per session (in-memory, resets on restart)
const lastSeen = new Map<string, number>();

export function chat_markRead(filename: string, messageCount: number): void {
  lastSeen.set(filename, messageCount);
}

export function chat_getUnread(filename: string, messageCount: number): number {
  const seen = lastSeen.get(filename) ?? 0;
  return Math.max(0, messageCount - seen);
}
