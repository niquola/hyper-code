import { chat_sessionListInfo } from "./chat_session.ts";
import { chat_getSessionFile } from "./chat_ctx.ts";
import { chat_getUnread } from "./chat_unread.ts";
import { escapeHtml } from "./jsx.ts";

export default async function (req: Request) {
  const sessions = await chat_sessionListInfo();
  const current = chat_getSessionFile();

  let html = `<div id="session-list" class="flex flex-col gap-0.5">`;
  for (const s of sessions) {
    const active = s.filename === current;
    const unread = chat_getUnread(s.filename, s.messageCount);
    const cls = active
      ? "bg-gray-100 text-gray-900"
      : "hover:bg-gray-50 text-gray-600";
    const enc = encodeURIComponent(s.filename);
    html += `<div class="group flex items-center rounded ${cls}" data-entity="session" data-id="${escapeHtml(s.filename)}">`;
    html += `<a href="/session/${enc}/" class="flex-1 min-w-0 px-3 py-2 block">`;
    html += `<div class="flex items-center gap-2"><span class="truncate text-sm" ondblclick="event.preventDefault();this.closest('[data-entity=session]').querySelector('.rename-form').classList.toggle('hidden')">${escapeHtml(s.title)}</span>`;
    if (unread > 0 && !active) {
      html += `<span class="shrink-0 w-2 h-2 rounded-full bg-blue-400"></span>`;
    }
    html += `</div>`;
    html += `<div class="text-xs text-gray-500">${s.messageCount} msgs</div>`;
    html += `</a>`;
    html += `<form method="POST" action="/session/delete" class="m-0 pr-2 opacity-0 group-hover:opacity-100">`;
    html += `<input type="hidden" name="filename" value="${escapeHtml(s.filename)}" />`;
    html += `<button type="submit" class="text-gray-500 hover:text-red-400 text-xs" onclick="return confirm('Delete?')">×</button>`;
    html += `</form>`;
    html += `</div>`;
    html += `<form method="POST" action="/session/rename" class="rename-form hidden px-3 pb-2">`;
    html += `<input type="hidden" name="filename" value="${escapeHtml(s.filename)}" />`;
    html += `<input type="text" name="title" value="${escapeHtml(s.title)}" class="w-full text-xs bg-white text-gray-900 border border-gray-300 rounded px-2 py-1" onkeydown="if(event.key==='Enter')this.form.submit();if(event.key==='Escape')this.form.classList.add('hidden')" />`;
    html += `</form>`;
  }
  if (sessions.length === 0) {
    html += `<div class="px-3 py-2 text-xs text-gray-500">No sessions yet</div>`;
  }
  html += `</div>`;
  return html;
}
