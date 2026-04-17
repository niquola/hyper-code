import type { AgentEvent } from "../agent/type_Event.ts";
import type { HtmlContent } from "../ai/type_Message.ts";
import { escapeHtml } from "../jsx.ts";
import { chat_view_toolCall } from "./view_toolCall.tsx";
import detectToolLang from "./detectToolLang.ts";
import getToolCode from "./getToolCode.ts";

type ToolBlock = { id: string; name: string; args: string; result?: string; resultHtml?: string; isError?: boolean };

function renderError(msg: string): string {
  let extra = "";
  if (msg.includes("CODEX_AUTH_EXPIRED")) {
    const clean = msg.replace("CODEX_AUTH_EXPIRED: ", "");
    extra = ` <a href="/settings" class="underline font-medium text-red-800 hover:text-red-900">Settings</a>`;
    return `<div data-entity="message" data-status="error" class="mb-4"><div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm" data-role="content">${escapeHtml(clean)}${extra}</div></div>`;
  }
  if (msg.includes("CODEX_AUTH_REFRESHED")) {
    const clean = msg.replace("CODEX_AUTH_REFRESHED: ", "");
    return `<div data-entity="message" data-status="error" class="mb-4"><div class="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-700 text-sm" data-role="content">${escapeHtml(clean)}</div></div>`;
  }
  return `<div data-entity="message" data-status="error" class="mb-4"><div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm" data-role="content">${escapeHtml(msg)}</div></div>`;
}

function renderToolBlock(t: ToolBlock, highlighted?: string, sessionFilename?: string): string {
  // html_message / html_dialog: just show the HTML, no tool chrome
  if ((t.name === "html_message" || t.name === "html_dialog") && t.resultHtml) {
    let html = t.resultHtml;
    if (sessionFilename) {
      html = html.replace(/hx-post="dispatch"/g, `hx-post="/session/${encodeURIComponent(sessionFilename)}/dispatch"`);
    }
    return `<div data-entity="widget" data-status="done" class="mb-3"><div class="hyper-ui">${html}</div></div>`;
  }

  // Parse args for display — hide large values
  let argsDisplay = t.args;
  try {
    const parsed = JSON.parse(t.args);
    argsDisplay = Object.entries(parsed)
      .filter(([k]) => k !== "content" && k !== "edits" && k !== "html")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  } catch {}

  // Use shared component for consistent rendering
  // When we have a highlighted snippet, treat it as HTML content; otherwise use
  // plain text result and any HTML provided directly by the tool.
  let textResult = t.result;
  let htmlContent = t.resultHtml;
  if (highlighted) {
    htmlContent = highlighted;
    textResult = undefined;
  }

  return chat_view_toolCall(t.name, argsDisplay, textResult ?? undefined, t.isError, htmlContent);
}


import type { Session } from "../chat/type_Session.ts";

function sendSSE(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, html: string): boolean {
  try {
    const lines = html.split("\n").map((l) => `data: ${l}`).join("\n");
    controller.enqueue(encoder.encode(`${lines}\n\n`));
    return true;
  } catch {
    return false;
  }
}

export default function chat_createSSEStream(
  session: Session,
  runAgent: (onEvent: (event: AgentEvent) => void) => Promise<void>,
): Response {
  let text = "";
  let thinking = "";
  let tools: ToolBlock[] = [];
  let finishedTools: ToolBlock[] = [];
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let renderQueue = Promise.resolve();

  const encoder = new TextEncoder();
  let closed = false;

  function send(html: string) {
    if (!closed) {
      if (!sendSSE(controller, encoder, html)) closed = true;
    }
    // Broadcast to all reconnected listeners
    for (const listener of session.sseListeners) {
      try { listener(html); } catch {}
    }
  }

  function renderStreaming() {
    let html = `<div data-entity="message" data-status="assistant" class="mb-4">`;

    if (thinking) {
      html += `<details class="mb-2" open><summary class="text-xs text-gray-400 cursor-pointer">Thinking...</summary><div class="text-xs text-gray-400 italic whitespace-pre-wrap mt-1" data-role="thinking">${escapeHtml(thinking)}</div></details>`;
    }

    // Show completed tools from previous turns
    for (const t of finishedTools) html += renderToolBlock(t, undefined, session.session_id);
    // Show current turn tools
    for (const t of tools) html += renderToolBlock(t, undefined, session.session_id);

    if (text) {
      const md = (Bun as any).markdown.html(text);
      html += `<div class="text-gray-900 prose max-w-none text-[14px]" data-role="content">${md}</div>`;
    } else if (tools.length === 0 && finishedTools.length === 0) {
      html += `<div class="flex items-center gap-2 text-gray-400 text-sm"><svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Thinking...</div>`;
    }

    html += `</div>`;
    send(html);
  }

  function queueFinalRender(finalText: string, finalThinking: string, allTools: ToolBlock[]) {
    renderQueue = renderQueue.then(async () => {
      let html = `<div data-entity="message" data-status="assistant" class="mb-4">`;

      if (finalThinking) {
        html += `<details class="mb-2"><summary class="text-xs text-gray-400 cursor-pointer">Thinking</summary><div class="text-xs text-gray-400 italic whitespace-pre-wrap mt-1" data-role="thinking">${escapeHtml(finalThinking)}</div></details>`;
      }

      for (const t of allTools) {
        const lang = detectToolLang(t.name, t.args);
        let highlighted: string | undefined;
        if (lang) {
          const code = getToolCode(t.name, t.args, t.result);
          if (code) highlighted = await ctx.ai.highlightCode(code, lang);
        }
        html += renderToolBlock(t, highlighted, session.session_id);
      }

      if (finalText) {
        const rendered = await ctx.ai.renderMarkdown(finalText);
        html += `<div class="text-gray-900 prose max-w-none text-[14px]" data-role="content">${rendered}</div>`;
      }

      html += `</div>`;
      send(html);
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;

      // Allow tools to push HTML directly (for blocking dialogs)
      session.emitHtml = (html: string) => send(html);

      runAgent((event) => {
        switch (event.type) {
          case "agent_start":
            renderStreaming();
            break;

          case "thinking_delta":
            thinking += event.delta;
            break;

          case "text_delta":
            text += event.delta;
            renderStreaming();
            break;

          case "tool_execution_start":
            tools.push({ id: event.toolCallId, name: event.toolName, args: JSON.stringify(event.args) });
            renderStreaming();
            break;

          case "tool_execution_end": {
            const t = tools.find((t) => t.id === event.toolCallId);
            if (t) {
              const htmlBlocks = event.result.content.filter((c) => c.type === "html");
              const textBlocks = event.result.content.filter((c) => c.type !== "html");
              t.result = textBlocks.map((c) => c.type === "text" ? c.text : "[image]").join("\n");
              if (htmlBlocks.length > 0) {
                t.resultHtml = htmlBlocks.map((c) => (c as HtmlContent).html).join("");
              }
              t.isError = event.isError;
            }
            renderStreaming();
            break;
          }

          case "turn_end":
            // Move current tools to finishedTools
            finishedTools.push(...tools);
            // Final render with markdown for this turn's text
            if (text) queueFinalRender(text, thinking, [...finishedTools]);
            text = "";
            thinking = "";
            tools = [];
            break;

          case "steer":
            // Steer message injected — no UI action needed, agent will see it next turn
            break;

          case "error":
            send(renderError(event.error));
            break;

          case "agent_end":
            renderQueue.then(() => {
              send(``);
              closed = true;
              try { controller.close(); } catch {}
            });
            break;
        }
      }).catch((err) => {
        send(renderError(String(err)));
        closed = true;
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
