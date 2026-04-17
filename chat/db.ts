// SQLite storage for sessions, messages, api keys, unread state
// Single source of truth — replaces .jsonl files, .title, .parent, .model, .offset, keys/, unread.json
import { Database } from "bun:sqlite";

export type SessionRow = {
  session_id: string;
  title: string;
  parent: string | null;
  model: string;
  offset: number | null;
  created_at: number;
  updated_at: number;
};

export type MessageRow = {
  id: number;
  session: string;
  role: string;
  content: string;
  timestamp: number;
};

export type SearchResult = {
  session: string;
  sessionTitle: string;
  role: string;
  content: string;
  timestamp: number;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'New Chat',
  parent TEXT,
  model TEXT NOT NULL DEFAULT '',
  "offset" INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (session) REFERENCES sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_keys (
  provider TEXT PRIMARY KEY,
  api_key TEXT NOT NULL,
  extra TEXT
);

CREATE TABLE IF NOT EXISTS unread (
  session_id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent);

CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content,
  content='messages',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
  INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
END;
CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
  INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.id, old.content);
END;
`;

export function chat_db(path?: string) {
  const dbPath = path || `${process.env.HYPER_SESSION_DIR || ".hyper"}/hyper.db`;
  if (dbPath !== ":memory:") {
    const { mkdirSync } = require("node:fs");
    const dir = dbPath.replace(/\/[^/]+$/, "");
    if (dir) mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA foreign_keys = ON;");
  db.exec(SCHEMA);

  // --- Sessions ---

  function createSession(opts: { title?: string; model?: string; parent?: string; offset?: number } = {}): string {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const id = Math.random().toString(36).slice(2, 8);
    const sessionId = `${ts}-${id}`;
    const now = Date.now();
    db.run(
      `INSERT INTO sessions (session_id, title, parent, model, "offset", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sessionId, opts.title || "New Chat", opts.parent || null, opts.model || "", opts.offset ?? null, now, now],
    );
    return sessionId;
  }

  function getSession(sessionId: string): SessionRow | null {
    return db.query("SELECT * FROM sessions WHERE session_id = ?").get(sessionId) as SessionRow | null;
  }

  function listSessions(): SessionRow[] {
    return db.query("SELECT * FROM sessions ORDER BY created_at DESC, session_id DESC").all() as SessionRow[];
  }

  function deleteSession(sessionId: string): void {
    db.run("DELETE FROM messages WHERE session = ?", [sessionId]);
    db.run("DELETE FROM unread WHERE session_id = ?", [sessionId]);
    db.run("DELETE FROM sessions WHERE session_id = ?", [sessionId]);
  }

  function setSessionTitle(sessionId: string, title: string): void {
    db.run("UPDATE sessions SET title = ?, updated_at = ? WHERE session_id = ?", [title, Date.now(), sessionId]);
  }

  function setSessionModel(sessionId: string, model: string): void {
    db.run("UPDATE sessions SET model = ?, updated_at = ? WHERE session_id = ?", [model, Date.now(), sessionId]);
  }

  function forkSession(parentFilename: string, task: string, offset?: number): string {
    const parent = getSession(parentFilename);
    const model = parent?.model || "";
    return createSession({
      title: `subagent: ${task.slice(0, 50)}`,
      parent: parentFilename,
      model,
      offset: offset ?? getFullMessages(parentFilename).length,
    });
  }

  function getChildren(parentFilename: string): SessionRow[] {
    return db.query("SELECT * FROM sessions WHERE parent = ? ORDER BY created_at").all(parentFilename) as SessionRow[];
  }

  // --- Messages ---

  function addMessage(session: string, msg: { role: string; content: string; timestamp: number }): number {
    const result = db.run(
      "INSERT INTO messages (session, role, content, timestamp) VALUES (?, ?, ?, ?)",
      [session, msg.role, msg.content, msg.timestamp],
    );
    db.run("UPDATE sessions SET updated_at = ? WHERE session_id = ?", [Date.now(), session]);
    return Number(result.lastInsertRowid);
  }

  function addMessages(session: string, msgs: { role: string; content: string; timestamp: number }[]): void {
    const stmt = db.prepare("INSERT INTO messages (session, role, content, timestamp) VALUES (?, ?, ?, ?)");
    const tx = db.transaction(() => {
      for (const msg of msgs) stmt.run(session, msg.role, msg.content, msg.timestamp);
      db.run("UPDATE sessions SET updated_at = ? WHERE session_id = ?", [Date.now(), session]);
    });
    tx();
  }

  function getMessages(session: string): MessageRow[] {
    return db.query("SELECT * FROM messages WHERE session = ? ORDER BY id").all(session) as MessageRow[];
  }

  function getMessageCount(sessionId: string): number {
    const row = db.query("SELECT COUNT(*) as count FROM messages WHERE session = ?").get(sessionId) as { count: number };
    return row.count;
  }

  function getFullMessages(session: string): MessageRow[] {
    const s = getSession(session);
    if (!s) return [];

    if (s.parent) {
      const parentMsgs = getFullMessages(s.parent);
      const limited = s.offset != null ? parentMsgs.slice(0, s.offset) : parentMsgs;
      const ownMsgs = getMessages(session);
      return [...limited, ...ownMsgs];
    }

    return getMessages(session);
  }

  function rewindMessages(session: string, keepCount: number): void {
    const msgs = getMessages(session);
    if (keepCount >= msgs.length) return;
    const cutoffId = msgs[keepCount]?.id;
    if (cutoffId != null) {
      db.run("DELETE FROM messages WHERE session = ? AND id >= ?", [session, cutoffId]);
    }
  }

  // --- API Keys ---

  function saveApiKey(provider: string, apiKey: string, extra?: Record<string, unknown>): void {
    db.run(
      "INSERT OR REPLACE INTO api_keys (provider, api_key, extra) VALUES (?, ?, ?)",
      [provider, apiKey, extra ? JSON.stringify(extra) : null],
    );
  }

  function getApiKey(provider: string): string {
    const row = db.query("SELECT api_key FROM api_keys WHERE provider = ?").get(provider) as { api_key: string } | null;
    return row?.api_key || "";
  }

  function getApiKeyExtra(provider: string): Record<string, unknown> | null {
    const row = db.query("SELECT extra FROM api_keys WHERE provider = ?").get(provider) as { extra: string | null } | null;
    if (!row?.extra) return null;
    try { return JSON.parse(row.extra); } catch { return null; }
  }

  // --- Unread ---

  function markRead(sessionId: string, messageCount: number): void {
    db.run("INSERT OR REPLACE INTO unread (session_id, last_seen) VALUES (?, ?)", [sessionId, messageCount]);
  }

  function getUnread(sessionId: string, messageCount: number): number {
    const row = db.query("SELECT last_seen FROM unread WHERE session_id = ?").get(sessionId) as { last_seen: number } | null;
    if (!row) return 0;
    return Math.max(0, messageCount - row.last_seen);
  }

  // --- Search ---

  function searchMessages(query: string, role?: string, limit = 50): SearchResult[] {
    // Use FTS5 + BM25 for ranked full-text search
    let sql = `
      SELECT m.session, s.title as sessionTitle, m.role, m.content, m.timestamp, bm25(messages_fts) as score
      FROM messages_fts
      JOIN messages m ON messages_fts.rowid = m.id
      JOIN sessions s ON m.session = s.session_id
      WHERE messages_fts MATCH ?`;
    const ftsQuery = query.replace(/[^\w\s]/g, " ").trim();
    if (!ftsQuery) return [];
    const params: any[] = [ftsQuery];

    if (role) {
      sql += " AND m.role = ?";
      params.push(role);
    }

    // Sort by relevance (bm25) with recency boost
    sql += " ORDER BY (score - (m.timestamp / 1e13)) LIMIT ?";
    params.push(limit);

    return db.query(sql).all(...params) as SearchResult[];
  }

  // --- Close ---

  function close(): void {
    db.close();
  }

  return {
    createSession, getSession, listSessions, deleteSession,
    setSessionTitle, setSessionModel, forkSession, getChildren,
    addMessage, addMessages, getMessages, getMessageCount, getFullMessages, rewindMessages,
    saveApiKey, getApiKey, getApiKeyExtra,
    markRead, getUnread,
    searchMessages,
    close,
  };
}

