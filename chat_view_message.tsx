import type { Message } from "./ai_type_Message.ts";
import { escapeHtml } from "./jsx.ts";
import { ai_renderMarkdown } from "./ai_renderMarkdown.ts";

export function chat_view_userMessage(content: string): string {
  return (
    <div data-entity="message" data-status="user" className="mb-4 flex justify-end">
      <div className="bg-gray-900 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] whitespace-pre-wrap" data-role="content">{escapeHtml(content)}</div>
    </div>
  );
}

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
      <div className="text-gray-900 prose prose-sm max-w-none" data-role="content" dangerouslySetInnerHTML={{ __html: html }}></div>
    </div>
  );
}

export function chat_view_toolCall(toolName: string, args: string, result?: string, isError?: boolean, htmlContent?: string): string {
  const hasContent = result != null || htmlContent;
  return (
    <div data-entity="tool" data-status={isError ? "error" : hasContent ? "done" : "running"} className="mb-3">
      <div className={`rounded border text-sm ${isError ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
        <div className="px-3 py-1.5 font-mono text-xs">
          <span className="font-semibold text-gray-700" data-role="tool-name">{escapeHtml(toolName)}</span>
          <span className="text-gray-400 ml-2" data-role="tool-args">{escapeHtml(args)}</span>
        </div>
        {htmlContent && (
          <div className={`hyper-ui border-t ${isError ? "border-red-200" : "border-green-200"} p-3`} data-role="tool-result" dangerouslySetInnerHTML={{ __html: htmlContent }}></div>
        )}
        {result != null && !htmlContent && (
          <details className={`border-t ${isError ? "border-red-200 text-red-700" : "border-green-200 text-gray-600"}`}>
            <summary className="px-3 py-1.5 text-xs cursor-pointer hover:bg-black/5">Output ({result.split("\n").length} lines)</summary>
            <div className="px-3 py-2 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto" data-role="tool-result">{escapeHtml(result)}</div>
          </details>
        )}
      </div>
    </div>
  );
}

export function chat_view_error(error: string): string {
  return (
    <div data-entity="message" data-status="error" className="mb-4">
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm" data-role="content">{error}</div>
    </div>
  );
}

export function chat_view_spinner(): string {
  return (
    <div id="spinner" className="mb-4 flex items-center gap-2 text-gray-400 text-sm">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      Thinking...
    </div>
  );
}
