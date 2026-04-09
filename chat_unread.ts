// Track last-seen message count per session — persisted in .hyper/unread.json
const SESSION_DIR = process.env.HYPER_SESSION_DIR || ".hyper";
const UNREAD_PATH = `${SESSION_DIR}/unread.json`;

let lastSeen: Record<string, number> = {};
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const data = require("node:fs").readFileSync(UNREAD_PATH, "utf-8");
    lastSeen = JSON.parse(data);
  } catch {}
}

function save() {
  try {
    require("node:fs").mkdirSync(SESSION_DIR, { recursive: true });
    require("node:fs").writeFileSync(UNREAD_PATH, JSON.stringify(lastSeen));
  } catch {}
}

export function chat_markRead(filename: string, messageCount: number): void {
  load();
  lastSeen[filename] = messageCount;
  save();
}

export function chat_getUnread(filename: string, messageCount: number): number {
  load();
  if (!(filename in lastSeen)) return 0;
  return Math.max(0, messageCount - lastSeen[filename]!);
}
