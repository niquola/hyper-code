import { chat_sessionListInfo, chat_sessionGetParent, chat_sessionGetModel } from "./chat_session.ts";
import { chat_getUnread } from "./chat_unread.ts";
import { escapeHtml } from "./jsx.ts";
import type { SessionInfo } from "./chat_type_SessionInfo.ts";

type TreeNode = SessionInfo & { children: TreeNode[]; depth: number };

async function buildTree(sessions: SessionInfo[]): Promise<TreeNode[]> {
  // Build parent map
  const parentMap = new Map<string, string>();
  for (const s of sessions) {
    const parent = await chat_sessionGetParent(s.filename);
    if (parent) parentMap.set(s.filename, parent);
  }

  // Build nodes
  const nodeMap = new Map<string, TreeNode>();
  for (const s of sessions) {
    nodeMap.set(s.filename, { ...s, children: [], depth: 0 });
  }

  // Link children
  const roots: TreeNode[] = [];
  for (const s of sessions) {
    const node = nodeMap.get(s.filename)!;
    const parentFilename = parentMap.get(s.filename);
    if (parentFilename && nodeMap.has(parentFilename)) {
      nodeMap.get(parentFilename)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Set depth
  function setDepth(nodes: TreeNode[], d: number) {
    for (const n of nodes) { n.depth = d; setDepth(n.children, d + 1); }
  }
  setDepth(roots, 0);

  // Flatten tree (parent then children)
  function flatten(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];
    for (const n of nodes) { result.push(n); result.push(...flatten(n.children)); }
    return result;
  }
  return flatten(roots);
}

async function renderSession(s: TreeNode, current: string | null): Promise<string> {
  const modelStr = await chat_sessionGetModel(s.filename);
  const active = s.filename === current;
  const unread = chat_getUnread(s.filename, s.messageCount);
  const cls = active ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-600";
  const enc = encodeURIComponent(s.filename);
  const indent = s.depth > 0 ? `padding-left: ${s.depth * 16 + 12}px` : "";
  const isChild = s.depth > 0;

  let html = `<div class="group flex items-center rounded ${cls}" data-entity="session" data-id="${escapeHtml(s.filename)}" style="${indent}">`;
  html += `<a href="/session/${enc}/" class="flex-1 min-w-0 px-3 py-2 block">`;
  if (isChild) html += `<span class="text-gray-300 text-xs mr-1">↳</span>`;
  html += `<div class="truncate text-sm">${escapeHtml(s.title)}</div>`;
  html += `<div class="text-xs text-gray-400">${s.messageCount} msgs${modelStr ? ` · ${escapeHtml(modelStr)}` : ""}</div>`;
  html += `</a>`;
  if (unread > 0 && !active) html += `<span class="shrink-0 w-2 h-2 rounded-full bg-blue-400 mr-1"></span>`;
  html += `<form method="POST" action="/session/delete" class="m-0 pr-2 opacity-0 group-hover:opacity-100">`;
  html += `<input type="hidden" name="filename" value="${escapeHtml(s.filename)}" />`;
  html += `<button type="submit" class="text-gray-500 hover:text-red-400 text-xs" onclick="return confirm('Delete?')">×</button>`;
  html += `</form></div>`;
  return html;
}

export default async function (req: Request) {
  const sessions = await chat_sessionListInfo();
  const url = new URL(req.url, "http://localhost");
  const current = url.searchParams.get("current") || null;
  const tree = await buildTree(sessions);

  let html = `<div id="session-list" class="flex flex-col gap-0.5">`;
  for (const s of tree) html += await renderSession(s, current);
  if (tree.length === 0) html += `<div class="px-3 py-2 text-xs text-gray-500">No sessions yet</div>`;
  html += `</div>`;
  return html;
}
