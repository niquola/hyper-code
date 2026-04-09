// Track last-seen message count per session (in-memory, resets on restart)
// After restart: all sessions assumed read. Dot only shows for NEW messages during this session.
const lastSeen = new Map<string, number>();

export function chat_markRead(filename: string, messageCount: number): void {
  lastSeen.set(filename, messageCount);
}

export function chat_getUnread(filename: string, messageCount: number): number {
  // If never tracked — assume fully read (no dot after restart)
  if (!lastSeen.has(filename)) return 0;
  const seen = lastSeen.get(filename)!;
  return Math.max(0, messageCount - seen);
}
