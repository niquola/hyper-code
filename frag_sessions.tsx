import type { Ctx } from "./agent_type_Ctx.ts";
import type { SessionRow } from "./chat/db.ts";
import { escapeHtml } from "./jsx.ts";

type TreeNode = SessionRow & { children: TreeNode[]; depth: number; msgCount: number };

function buildTree(sessions: SessionRow[], db: any): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();
  for (const s of sessions) {
    nodeMap.set(s.session_id, { ...s, children: [], depth: 0, msgCount: db.getMessageCount(s.session_id) });
  }

  const roots: TreeNode[] = [];
  for (const s of sessions) {
    const node = nodeMap.get(s.session_id)!;
    if (s.parent && nodeMap.has(s.parent)) {
      nodeMap.get(s.parent)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function setDepth(nodes: TreeNode[], d: number) {
    for (const n of nodes) { n.depth = d; setDepth(n.children, d + 1); }
  }
  setDepth(roots, 0);

  function flatten(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];
    for (const n of nodes) { result.push(n); result.push(...flatten(n.children)); }
    return result;
  }
  return flatten(roots);
}

function renderSession(s: TreeNode, current: string | null, db: any): string {
  const active = s.session_id === current;
  const unread = db.getUnread(s.session_id, s.msgCount);
  const cls = active ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-600";
  const enc = encodeURIComponent(s.session_id);
  const indent = s.depth > 0 ? `padding-left: ${s.depth * 16 + 12}px` : "";
  const isChild = s.depth > 0;

  let html = `<div class="group flex items-center rounded ${cls}" data-entity="session" data-id="${escapeHtml(s.session_id)}" style="${indent}">`;
  html += `<a href="/session/${enc}/" class="flex-1 min-w-0 px-3 py-2 block">`;
  html += `<div class="truncate text-sm">`;
  if (isChild) html += `<span class="text-gray-300 text-xs mr-1">↳</span>`;
  html += `${escapeHtml(s.title)}</div>`;
  html += `<div class="text-xs text-gray-400">${s.msgCount} msgs${s.model ? ` · ${escapeHtml(s.model.split("/").pop() || s.model)}` : ""}</div>`;
  html += `</a>`;
  if (unread > 0 && !active) html += `<span class="shrink-0 w-2 h-2 rounded-full bg-blue-400 mr-1"></span>`;
  html += `<form method="POST" action="/session/delete" class="m-0 pr-2 opacity-0 group-hover:opacity-100">`;
  html += `<input type="hidden" name="filename" value="${escapeHtml(s.session_id)}" />`;
  html += `<button type="submit" class="text-gray-500 hover:text-red-400 text-xs" onclick="return confirm('Delete?')">×</button>`;
  html += `</form></div>`;
  return html;
}

export default async function (ctx: Ctx, req: Request) {
  const db = ctx.db;
  const sessions = db.listSessions();
  const url = new URL(req.url, "http://localhost");
  const current = url.searchParams.get("current") || null;
  const tree = buildTree(sessions, db);

  let html = `<div id="session-list" class="flex flex-col gap-0.5">`;
  for (const s of tree) html += renderSession(s, current, db);
  if (tree.length === 0) html += `<div class="px-3 py-2 text-xs text-gray-500">No sessions yet</div>`;
  html += `</div>`;
  return html;
}
