import { chat_sessionListInfo } from "./chat_session.ts";
import { chat_getSessionFile } from "./chat_ctx.ts";
import { escapeHtml } from "./jsx.ts";

export default async function (req: Request) {
  const sessions = await chat_sessionListInfo();
  const current = chat_getSessionFile();

  let html = `<div id="session-list" class="flex flex-col gap-0.5">`;
  for (const s of sessions) {
    const active = s.filename === current;
    const cls = active
      ? "bg-gray-700 text-white"
      : "hover:bg-gray-800 text-gray-400";
    html += `<a href="/session/${encodeURIComponent(s.filename)}" class="block px-3 py-2 rounded text-sm ${cls}" data-entity="session" data-id="${escapeHtml(s.filename)}">`;
    html += `<div class="truncate">${escapeHtml(s.title)}</div>`;
    html += `<div class="text-xs text-gray-500">${s.messageCount} msgs</div>`;
    html += `</a>`;
  }
  if (sessions.length === 0) {
    html += `<div class="px-3 py-2 text-xs text-gray-400">No sessions yet</div>`;
  }
  html += `</div>`;
  return html;
}
