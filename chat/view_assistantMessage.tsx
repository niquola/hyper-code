import { escapeHtml } from "../jsx.ts";
import { ai_renderMarkdown } from "../ai_renderMarkdown.ts";

export async function chat_view_assistantMessage(text: string, thinking?: string): Promise<string> {
  const html = await ai_renderMarkdown(text);
  return (
    <div data-entity="message" data-status="assistant" className="mb-4">
      {thinking && (
        <details className="mb-2">
          <summary className="text-xs text-gray-400 cursor-pointer">Thinking...</summary>
          <div className="text-xs text-gray-400 italic whitespace-pre-wrap mt-1" data-role="thinking">{escapeHtml(thinking!)}</div>
        </details>
      )}
      <div className="text-gray-900 prose max-w-none text-[14px]" data-role="content" dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}
