import { escapeHtml } from "./jsx.ts";

export function chat_view_userMessage(content: string, messageIndex?: number): string {
  const rewindBtn = messageIndex != null
    ? `<button onclick="if(confirm('Rewind to this message?'))location.href=this.dataset.url" data-url="rewind?index=${messageIndex}" class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity" title="Rewind to here"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></button>`
    : "";
  return (
    <div data-entity="message" data-status="user" className="group mb-4 flex items-start justify-end gap-2">
      {rewindBtn}
      <div className="bg-gray-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] whitespace-pre-wrap text-[14px]" data-role="content">{escapeHtml(content)}</div>
    </div>
  );
}
