// Session persistence: .hyper/<timestamp>-<id>.jsonl
// Each line is a JSON-serialized Message.
// On startup, loads the latest session file.

import type { Message } from "./ai_type_Message.ts";
import { mkdirSync, appendFileSync } from "node:fs";

const SESSION_DIR = ".hyper";

function ensureDir() {
  mkdirSync(SESSION_DIR, { recursive: true });
}

export function chat_sessionList(): string[] {
  try {
    const glob = new Bun.Glob("*.jsonl");
    const files: string[] = [];
    for (const f of glob.scanSync({ cwd: SESSION_DIR })) {
      files.push(f);
    }
    return files.sort();
  } catch {
    return [];
  }
}

export function chat_sessionLatest(): string | null {
  const files = chat_sessionList();
  return files.length > 0 ? files[files.length - 1]! : null;
}

export function chat_sessionCreate(): string {
  ensureDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const id = Math.random().toString(36).slice(2, 8);
  const filename = `${ts}-${id}.jsonl`;
  // Create empty file so it appears in session list
  Bun.write(`${SESSION_DIR}/${filename}`, "");
  return filename;
}

export async function chat_sessionLoad(filename: string): Promise<Message[]> {
  const path = `${SESSION_DIR}/${filename}`;
  const file = Bun.file(path);
  if (!(await file.exists())) return [];

  const text = await file.text();
  const messages: Message[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      messages.push(JSON.parse(line));
    } catch {}
  }
  return messages;
}

export function chat_sessionAppend(filename: string, ...msgs: Message[]): void {
  ensureDir();
  const path = `${SESSION_DIR}/${filename}`;
  const data = msgs.map((m) => JSON.stringify(m)).join("\n") + "\n";
  appendFileSync(path, data);
}

export type SessionInfo = {
  filename: string;
  title: string;
  createdAt: string;
  messageCount: number;
};

/** Get or set custom session title */
export async function chat_sessionGetTitle(filename: string): Promise<string | null> {
  const path = `${SESSION_DIR}/${filename}.title`;
  const file = Bun.file(path);
  if (await file.exists()) return (await file.text()).trim() || null;
  return null;
}

export async function chat_sessionSetTitle(filename: string, title: string): Promise<void> {
  ensureDir();
  await Bun.write(`${SESSION_DIR}/${filename}.title`, title.trim());
}

/** Get session info — custom title, or first user message, or "New Chat" */
export async function chat_sessionInfo(filename: string): Promise<SessionInfo> {
  const path = `${SESSION_DIR}/${filename}`;
  const file = Bun.file(path);
  let title = "New Chat";
  let messageCount = 0;

  // Check custom title first
  const customTitle = await chat_sessionGetTitle(filename);
  if (customTitle) title = customTitle;

  if (await file.exists()) {
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    messageCount = lines.length;

    // Fall back to first user message if no custom title
    if (!customTitle) {
      for (const line of lines) {
        try {
          const msg = JSON.parse(line);
          if (msg.role === "user") {
            const content = typeof msg.content === "string" ? msg.content : msg.content?.[0]?.text || "";
            title = content.slice(0, 60) || "New Chat";
            if (content.length > 60) title += "...";
            break;
          }
        } catch {}
      }
    }
  }

  const createdAt = filename.slice(0, 19).replace(/T/, " ").replace(/-/g, (m, i) => i > 9 ? ":" : "-");
  return { filename, title, createdAt, messageCount };
}

export async function chat_sessionListInfo(): Promise<SessionInfo[]> {
  const files = chat_sessionList();
  const infos = await Promise.all(files.map(chat_sessionInfo));
  return infos.reverse(); // newest first
}

export function chat_sessionDelete(filename: string): void {
  const { unlinkSync } = require("node:fs");
  try { unlinkSync(`${SESSION_DIR}/${filename}`); } catch {}
  try { unlinkSync(`${SESSION_DIR}/${filename}.title`); } catch {}
}
