import { escapeHtml } from "./jsx.ts";

export function chat_view_userMessage(content: string): string {
  return (
    <div data-entity="message" data-status="user" className="mb-4 flex justify-end">
      <div className="bg-gray-500 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] whitespace-pre-wrap text-[14px]" data-role="content">{escapeHtml(content)}</div>
    </div>
  );
}
