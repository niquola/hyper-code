import { chat_sessionListInfo, chat_sessionGetParent } from "./chat_session.ts";
import { chat_getSessionFile } from "./chat_ctx.ts";
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

function renderSession(s: TreeNode, current: string | null): string {
  const active = s.filename === current;
  const unread = chat_getUnread(s.filename, s.messageCount);
  const cls = active ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50 text-gray-600";
  const enc = encodeURIComponent(s.filename);
  const indent = s.depth > 0 ? `padding-left: ${s.depth * 16 + 12}px` : "";
  const isChild = s.depth > 0;

  let html = `<div data-entity="session" data-id="${escapeHtml(s.filename)}" style="${indent}">`;
  html += `<div class="group flex items-center rounded ${cls}">`;
  html += `<a href="/session/${enc}/" class="flex-1 min-w-0 px-3 py-2 block">`;
  html += `<div class="flex items-center gap-2">`;
  if (isChild) html += `<span class="text-gray-300 text-xs">↳</span>`;
  html += `<span class="truncate text-sm" ondblclick="event.preventDefault();this.closest('[data-entity=session]').querySelector('.rename-form').classList.toggle('hidden')">${escapeHtml(s.title)}</span>`;
  if (unread > 0 && !active) html += `<span class="shrink-0 w-2 h-2 rounded-full bg-blue-400"></span>`;
  html += `</div>`;
  html += `<div class="text-xs text-gray-500">${s.messageCount} msgs</div>`;
  html += `</a>`;
  html += `<form method="POST" action="/session/delete" class="m-0 pr-2 opacity-0 group-hover:opacity-100">`;
  html += `<input type="hidden" name="filename" value="${escapeHtml(s.filename)}" />`;
  html += `<button type="submit" class="text-gray-500 hover:text-red-400 text-xs" onclick="return confirm('Delete?')">×</button>`;
  html += `</form></div>`;
  html += `<form method="POST" action="/session/rename" class="rename-form hidden px-3 pb-2">`;
  html += `<input type="hidden" name="filename" value="${escapeHtml(s.filename)}" />`;
  html += `<input type="text" name="title" value="${escapeHtml(s.title)}" class="w-full text-xs bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" onkeydown="if(event.key==='Enter')this.form.submit();if(event.key==='Escape')this.form.classList.add('hidden')" />`;
  html += `</form></div>`;
  return html;
}

export default async function (req: Request) {
  const sessions = await chat_sessionListInfo();
  const current = chat_getSessionFile();
  const tree = await buildTree(sessions);

  let html = `<div id="session-list" class="flex flex-col gap-0.5">`;
  for (const s of tree) html += renderSession(s, current);
  if (tree.length === 0) html += `<div class="px-3 py-2 text-xs text-gray-500">No sessions yet</div>`;
  html += `</div>`;
  return html;
}
