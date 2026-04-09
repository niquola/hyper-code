// Session persistence: .hyper/<timestamp>-<id>.jsonl
// Each line is a JSON-serialized Message.
// On startup, loads the latest session file.

import type { Message } from "./ai_type_Message.ts";
import type { SessionInfo } from "./chat_type_SessionInfo.ts";
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
  // Prefer latest non-empty session; fall back to latest empty
  for (let i = files.length - 1; i >= 0; i--) {
    const size = Bun.file(`${SESSION_DIR}/${files[i]}`).size;
    if (size > 0) return files[i]!;
  }
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

/** Overwrite entire session file (for mutations like dispatch replacement) */
export function chat_sessionRewrite(filename: string, messages: Message[]): void {
  ensureDir();
  const path = `${SESSION_DIR}/${filename}`;
  const data = messages.map((m) => JSON.stringify(m)).join("\n") + (messages.length > 0 ? "\n" : "");
  Bun.write(path, data);
}

export type { SessionInfo } from "./chat_type_SessionInfo.ts";

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
  try { unlinkSync(`${SESSION_DIR}/${filename}.parent`); } catch {}
  try { unlinkSync(`${SESSION_DIR}/${filename}.offset`); } catch {}
}

/** Fork session: copy parent messages to new child, set parent link */
export async function chat_sessionFork(parentFilename: string, task: string, dir?: string): Promise<string> {
  const d = dir || SESSION_DIR;
  const { mkdirSync, copyFileSync } = require("node:fs");
  mkdirSync(d, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const id = Math.random().toString(36).slice(2, 8);
  const childFilename = `${ts}-${id}.jsonl`;

  // Copy parent messages
  const parentPath = `${d}/${parentFilename}`;
  const childPath = `${d}/${childFilename}`;
  try { copyFileSync(parentPath, childPath); } catch { await Bun.write(childPath, ""); }

  // Count parent messages for render offset
  const parentLines = await Bun.file(parentPath).text().catch(() => "");
  const parentMsgCount = parentLines.split("\n").filter((l: string) => l.trim()).length;

  // Set parent link, title, and offset
  await Bun.write(`${childPath}.parent`, parentFilename);
  await Bun.write(`${childPath}.title`, `subagent: ${task.slice(0, 50)}`);
  await Bun.write(`${childPath}.offset`, String(parentMsgCount));

  return childFilename;
}

/** Get parent message offset (how many messages are from parent) */
export async function chat_sessionGetOffset(filename: string, dir?: string): Promise<number> {
  const d = dir || SESSION_DIR;
  const file = Bun.file(`${d}/${filename}.offset`);
  if (await file.exists()) return parseInt(await file.text(), 10) || 0;
  return 0;
}

/** Get parent session filename */
export async function chat_sessionGetParent(filename: string, dir?: string): Promise<string | null> {
  const d = dir || SESSION_DIR;
  const file = Bun.file(`${d}/${filename}.parent`);
  if (await file.exists()) return (await file.text()).trim() || null;
  return null;
}

/** Get child session filenames */
export async function chat_sessionGetChildren(parentFilename: string, dir?: string): Promise<string[]> {
  const d = dir || SESSION_DIR;
  const glob = new Bun.Glob("*.jsonl");
  const files: string[] = [];
  try { for (const f of glob.scanSync({ cwd: d })) files.push(f); } catch {}
  const children: string[] = [];
  for (const f of files) {
    const parentFile = Bun.file(`${d}/${f}.parent`);
    if (await parentFile.exists()) {
      const parent = (await parentFile.text()).trim();
      if (parent === parentFilename) children.push(f);
    }
  }
  return children;
}
