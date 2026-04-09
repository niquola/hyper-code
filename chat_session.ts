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
