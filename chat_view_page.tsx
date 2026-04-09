import type { Message, ToolCall, AssistantMessage, ToolResultMessage, TextContent, ThinkingContent, HtmlContent } from "./ai_type_Message.ts";
import { chat_view_userMessage, chat_view_assistantMessage, chat_view_toolCall } from "./chat_view_message.tsx";
import { escapeHtml } from "./jsx.ts";
import { detectToolLang, getToolCode } from "./chat_toolCode.ts";
import { ai_highlightCode } from "./ai_renderMarkdown.ts";
import { CHAT_SCRIPT } from "./chat_script.ts";

export async function chat_view_page(messages: Message[], sessionFilename?: string, isStreaming?: boolean): Promise<string> {
  // Index toolResults by toolCallId for lookup
  const toolResults = new Map<string, ToolResultMessage>();
  for (const msg of messages) {
    if (msg.role === "toolResult") toolResults.set(msg.toolCallId, msg);
  }

  const rendered: string[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    if (msg.role === "user") {
      const content = typeof msg.content === "string" ? msg.content : msg.content.map((c) => c.type === "text" ? c.text : "[image]").join("");
      rendered.push(chat_view_userMessage(content, i));
    } else if (msg.role === "assistant") {
      const text = msg.content.filter((c): c is TextContent => c.type === "text").map((c) => c.text).join("");
      const thinking = msg.content.filter((c): c is ThinkingContent => c.type === "thinking").map((c) => c.thinking).join("");
      const toolCalls = msg.content.filter((c) => c.type === "toolCall") as ToolCall[];

      for (const tc of toolCalls) {
        const tr = toolResults.get(tc.id);
        const textResult = tr ? tr.content.filter((c): c is TextContent => c.type === "text").map((c) => c.text).join("\n") : undefined;
        const htmlResult = tr ? tr.content.filter((c): c is HtmlContent => c.type === "html").map((c) => c.html).join("") : undefined;

        if (tc.name === "html_message" && htmlResult) {
          rendered.push(`<div data-entity="widget" class="mb-3"><div class="hyper-ui">${htmlResult}</div></div>`);
          continue;
        }

        if (tc.name === "html_dialog") {
          const title = tc.arguments.title || "Dialog";
          rendered.push(`<div data-entity="tool" data-status="done" class="mb-2 text-xs text-gray-400">${escapeHtml(String(title))}</div>`);
          continue;
        }

        const args = Object.entries(tc.arguments).filter(([k]) => k !== "content" && k !== "edits" && k !== "html").map(([k, v]) => `${k}: ${v}`).join(", ");
        const argsJson = JSON.stringify(tc.arguments);

        let highlightedHtml = htmlResult;
        const lang = detectToolLang(tc.name, argsJson);
        if (lang && textResult && !htmlResult) {
          const code = getToolCode(tc.name, argsJson, textResult);
          if (code) {
            const hl = await ai_highlightCode(code, lang);
            if (hl) highlightedHtml = hl;
          }
        }

        rendered.push(chat_view_toolCall(tc.name, args, highlightedHtml ? undefined : textResult, tr?.isError, highlightedHtml || undefined));
      }

      if (text) {
        rendered.push(await chat_view_assistantMessage(text, thinking || undefined));
      }
    }
  }
  return (
    <div data-page="chat" data-session={sessionFilename || ""} data-streaming={isStreaming ? "true" : "false"} className="flex flex-col h-full">
      <div id="messages" className="flex-1 overflow-y-auto py-4" style="min-height: 0">
        <div className="max-w-3xl mx-auto px-4">
          {rendered.join("")}
          <div id="stream"></div>
        </div>
      </div>
      <div id="input-area" className="shrink-0 border-t border-gray-200 py-3">
        <div className="max-w-3xl mx-auto px-4">
        <form id="chat-form" data-form="prompt" method="POST" action="/chat">
          <textarea
            name="prompt"
            rows="3"
            placeholder="Enter — send · Ctrl+Enter — steer · Esc — stop"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            onkeydown="handleKey(event)"
          ></textarea>
          <div id="queue-indicator" className="text-xs text-blue-500 mt-1 hidden"></div>
        </form>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: CHAT_SCRIPT }} />
    </div>
  );
}
