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
  return `${ts}-${id}.jsonl`;
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
  createdAt: string; // from filename timestamp
  messageCount: number;
};

/** Get session title from first user message (first line of jsonl) */
export async function chat_sessionInfo(filename: string): Promise<SessionInfo> {
  const path = `${SESSION_DIR}/${filename}`;
  const file = Bun.file(path);
  let title = "New Chat";
  let messageCount = 0;

  if (await file.exists()) {
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    messageCount = lines.length;
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

  // Extract timestamp from filename: 2026-04-09T09-28-48-xxx.jsonl
  const createdAt = filename.slice(0, 19).replace(/T/, " ").replace(/-/g, (m, i) => i > 9 ? ":" : "-");

  return { filename, title, createdAt, messageCount };
}

export async function chat_sessionListInfo(): Promise<SessionInfo[]> {
  const files = chat_sessionList();
  const infos = await Promise.all(files.map(chat_sessionInfo));
  return infos.reverse(); // newest first
}

export function chat_sessionDelete(filename: string): void {
  try {
    const { unlinkSync } = require("node:fs");
    unlinkSync(`${SESSION_DIR}/${filename}`);
  } catch {}
}
