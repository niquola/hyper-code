import { escapeHtml } from "../jsx.ts";

export default function chat_view_userMessage(content: string, messageIndex?: number, sessionId?: string): string {
  const base = sessionId ? `/session/${encodeURIComponent(sessionId)}` : "";
  const show = messageIndex != null && sessionId;

  const rewindBtn = show
    ? `<button onclick="if(confirm('Rewind to this message?'))location.href='${base}/rewind?index=${messageIndex}'" data-action="rewind" class="p-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity" title="Rewind to here"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></button>`
    : "";

  const forkBtn = show
    ? `<button hx-post="${base}/fork" hx-vals='{"offset":"${messageIndex! + 1}"}' data-action="fork" class="p-1 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity" title="Fork from here"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M18 9c0 4-6 6-6 6s0 2-6 6"></path></svg></button>`
    : "";

  return (
    <div data-entity="message" data-status="user" className="group mb-4 flex items-start justify-end gap-0.5">
      {rewindBtn}
      {forkBtn}
      <div className="bg-gray-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] whitespace-pre-wrap text-[14px]" data-role="content">{escapeHtml(content)}</div>
    </div>
  );
}
