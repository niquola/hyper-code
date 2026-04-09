import type { AgentEvent } from "./agent_type_Event.ts";
import { escapeHtml } from "./jsx.ts";
import { ai_renderMarkdown, ai_highlightCode } from "./ai_renderMarkdown.ts";

type ToolBlock = { id: string; name: string; args: string; result?: string; resultHtml?: string; isError?: boolean };

function renderToolBlock(t: ToolBlock, highlighted?: string): string {
  // render_html / html_dialog: just show the HTML, no tool chrome
  if ((t.name === "html_message" || t.name === "html_dialog") && t.resultHtml) {
    return `<div data-entity="widget" data-status="done" class="mb-3"><div class="hyper-ui">${t.resultHtml}</div></div>`;
  }

  const status = t.isError ? "error" : t.result != null ? "done" : "running";
  const border = t.isError ? "border-red-200 bg-red-50" : t.result != null ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50";
  const resultBorder = t.isError ? "border-red-200 text-red-700" : "border-green-200 text-gray-600";

  // Parse args for display — hide large values like file content, html
  let argsDisplay = t.args;
  try {
    const parsed = JSON.parse(t.args);
    argsDisplay = Object.entries(parsed)
      .filter(([k]) => k !== "content" && k !== "edits" && k !== "html")
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  } catch {}

  let html = `<div data-entity="tool" data-status="${status}" class="mb-3"><div class="rounded-lg border text-sm ${border}">`;
  html += `<div class="px-3 py-2 font-mono text-xs flex items-center gap-2"><span class="font-semibold text-gray-700" data-role="tool-name">${escapeHtml(t.name)}</span><span class="text-gray-400" data-role="tool-args">${escapeHtml(argsDisplay)}</span></div>`;

  if (t.resultHtml) {
    html += `<div class="hyper-ui border-t ${resultBorder} p-3" data-role="tool-result">${t.resultHtml}</div>`;
  } else if (t.result != null) {
    // For write/edit: show the written code in the collapsible, not the status message
    const code = getToolCode(t);
    const displayContent = highlighted || (code ? escapeHtml(code) : escapeHtml(t.result));
    const lineCount = (code || t.result).split("\n").length;
    const label = t.name === "write" ? `${escapeHtml(t.result)} — ${lineCount} lines`
                : t.name === "edit" ? `${escapeHtml(t.result)} — diff`
                : `Output (${lineCount} lines)`;
    const hasHighlight = !!(highlighted || code);
    html += `<details class="border-t ${resultBorder}"><summary class="px-3 py-1.5 text-xs cursor-pointer hover:bg-black/5">${label}</summary>`;
    html += `<div class="${hasHighlight ? '' : 'px-3 py-2 '}text-xs whitespace-pre-wrap max-h-80 overflow-y-auto" data-role="tool-result">${displayContent}</div>`;
    html += `</details>`;
  } else {
    html += `<div class="px-3 py-1.5 border-t border-yellow-200 text-xs text-gray-400 flex items-center gap-1"><svg class="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Running...</div>`;
  }
  html += `</div></div>`;
  return html;
}

const TOOLS_WITH_PATH = new Set(["read", "write", "edit"]);

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
  json: "json", css: "css", html: "html", sql: "sql",
  py: "python", rb: "ruby", go: "go", rs: "rust",
  java: "java", yaml: "yaml", yml: "yaml", toml: "toml",
  sh: "bash", bash: "bash", md: "markdown", xml: "xml",
  dockerfile: "dockerfile", diff: "diff",
};

function detectLang(t: ToolBlock): string | null {
  if (!TOOLS_WITH_PATH.has(t.name)) return null;
  try {
    const parsed = JSON.parse(t.args);
    const path = parsed.path as string;
    const ext = path.split(".").pop()?.toLowerCase();
    return ext ? EXT_TO_LANG[ext] ?? null : null;
  } catch { return null; }
}

// Strip line numbers (1\t...) from read tool output for highlighting
function stripLineNumbers(text: string): string {
  return text.split("\n").map(l => {
    const m = l.match(/^\d+\t(.*)/);
    return m ? m[1]! : l;
  }).join("\n");
}

// Extract code to highlight from a tool block
function getToolCode(t: ToolBlock): string | null {
  if (t.name === "read" && t.result) {
    return stripLineNumbers(t.result);
  }
  if (t.name === "write") {
    try { return JSON.parse(t.args).content; } catch { return null; }
  }
  if (t.name === "edit") {
    // Show edits as diff-like: oldText → newText
    try {
      const parsed = JSON.parse(t.args);
      if (parsed.edits) {
        return parsed.edits.map((e: any) =>
          `// --- old ---\n${e.oldText}\n// --- new ---\n${e.newText}`
        ).join("\n\n");
      }
    } catch {}
    return null;
  }
  return null;
}

import type { Session } from "./chat_type_Session.ts";

function sendSSE(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, html: string): boolean {
  try {
    const lines = html.split("\n").map((l) => `data: ${l}`).join("\n");
    controller.enqueue(encoder.encode(`${lines}\n\n`));
    return true;
  } catch {
    return false;
  }
}

export function chat_createSSEStream(
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
    for (const t of finishedTools) html += renderToolBlock(t);
    // Show current turn tools
    for (const t of tools) html += renderToolBlock(t);

    if (text) {
      html += `<div class="text-gray-900 whitespace-pre-wrap" data-role="content">${escapeHtml(text)}</div>`;
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
        const lang = detectLang(t);
        let highlighted: string | undefined;
        if (lang) {
          const code = getToolCode(t);
          if (code) highlighted = await ai_highlightCode(code, lang);
        }
        html += renderToolBlock(t, highlighted);
      }

      if (finalText) {
        const rendered = await ai_renderMarkdown(finalText);
        html += `<div class="text-gray-900 prose prose-sm max-w-none" data-role="content">${rendered}</div>`;
      }

      html += `</div>`;
      send(html);
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;

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
                t.resultHtml = htmlBlocks.map((c) => (c as any).html).join("");
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
            send(`<div data-entity="message" data-status="error" class="mb-4"><div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm" data-role="content">${escapeHtml(event.error)}</div></div>`);
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
        send(`<div data-entity="message" data-status="error" class="mb-4"><div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm" data-role="content">${escapeHtml(String(err))}</div></div>`);
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
