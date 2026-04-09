import type { Message, ToolCall, AssistantMessage, ToolResultMessage } from "./ai_type_Message.ts";
import { chat_view_userMessage, chat_view_assistantMessage, chat_view_toolCall } from "./chat_view_message.tsx";

export async function chat_view_page(messages: Message[], sessionFilename?: string, isStreaming?: boolean): Promise<string> {
  // Index toolResults by toolCallId for lookup
  const toolResults = new Map<string, ToolResultMessage>();
  for (const msg of messages) {
    if (msg.role === "toolResult") toolResults.set(msg.toolCallId, msg);
  }

  const rendered: string[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      const content = typeof msg.content === "string" ? msg.content : msg.content.map((c) => c.type === "text" ? c.text : "[image]").join("");
      rendered.push(chat_view_userMessage(content));
    } else if (msg.role === "assistant") {
      const text = msg.content.filter((c) => c.type === "text").map((c) => (c as any).text).join("");
      const thinking = msg.content.filter((c) => c.type === "thinking").map((c) => (c as any).thinking).join("");
      const toolCalls = msg.content.filter((c) => c.type === "toolCall") as ToolCall[];

      // Render tool calls with their results
      for (const tc of toolCalls) {
        const tr = toolResults.get(tc.id);
        const textResult = tr ? tr.content.filter((c) => c.type === "text").map((c) => (c as any).text).join("\n") : undefined;
        const htmlResult = tr ? tr.content.filter((c) => c.type === "html").map((c) => (c as any).html).join("") : undefined;

        // render_html: just show HTML, no tool chrome
        if (tc.name === "render_html" && htmlResult) {
          rendered.push(`<div data-entity="widget" class="mb-3"><div class="hyper-ui">${htmlResult}</div></div>`);
          continue;
        }

        const args = Object.entries(tc.arguments).filter(([k]) => k !== "content" && k !== "edits" && k !== "html").map(([k, v]) => `${k}: ${v}`).join(", ");
        rendered.push(chat_view_toolCall(tc.name, args, textResult || undefined, tr?.isError, htmlResult || undefined));
      }

      // Render text if present
      if (text) {
        rendered.push(await chat_view_assistantMessage(text, thinking || undefined));
      }
    }
    // toolResult already rendered above with its toolCall — skip standalone
  }
  return (
    <div data-page="chat" data-session={sessionFilename || ""} data-streaming={isStreaming ? "true" : "false"} className="flex flex-col" style="height: calc(100dvh - 45px)">
      <div id="messages" className="flex-1 overflow-y-auto py-4" style="min-height: 0">
        {rendered.join("")}
        <div id="stream"></div>
      </div>
      <div id="input-area" className="shrink-0 border-t border-gray-200 py-3">
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
      <script dangerouslySetInnerHTML={{ __html: CHAT_SCRIPT }} />
    </div>
  );
}

const CHAT_SCRIPT = `
var streaming = false;
var textarea = document.querySelector('#chat-form textarea');
var messages = document.getElementById('messages');
var streamDiv = document.getElementById('stream');
var queueInd = document.getElementById('queue-indicator');

function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function addUserBubble(text, label) {
  var div = document.createElement('div');
  div.setAttribute('data-entity', 'message');
  div.setAttribute('data-status', 'user');
  div.className = 'mb-4';
  var lbl = label || 'You';
  var cls = label === 'Steer' ? 'bg-orange-100' : 'bg-gray-100';
  div.innerHTML = '<div class="text-xs font-medium text-gray-500 mb-1" data-role="label">' + lbl + '</div><div class="' + cls + ' rounded-lg px-4 py-3 text-gray-900 whitespace-pre-wrap" data-role="content">' + esc(text) + '</div>';
  messages.insertBefore(div, streamDiv);
  messages.scrollTop = messages.scrollHeight;
}

function updateStats() {
  fetch('/stats').then(function(r) { return r.text(); }).then(function(h) {
    var el = document.getElementById('nav-stats');
    if (el) el.outerHTML = h;
  });
}

function showQueue(text) {
  if (text) { queueInd.textContent = text; queueInd.classList.remove('hidden'); }
  else { queueInd.classList.add('hidden'); }
}

function handleKey(e) {
  if (e.key === 'Escape') {
    // Abort
    if (streaming) fetch('/abort', { method: 'POST' }).then(function() { location.reload(); });
    return;
  }
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    // Normal send / follow-up
    e.preventDefault();
    document.getElementById('chat-form').requestSubmit();
    return;
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    // Steer — interrupt current run
    e.preventDefault();
    var text = textarea.value.trim();
    if (!text || !streaming) return;
    textarea.value = '';
    addUserBubble(text, 'Steer');
    var body = new FormData();
    body.set('prompt', text);
    fetch('/steer', { method: 'POST', body: body });
    return;
  }
}

async function runStream(prompt) {
  streaming = true;
  textarea.placeholder = 'Enter — queue follow-up · Ctrl+Enter — steer · Esc — stop';
  addUserBubble(prompt);
  textarea.value = '';

  try {
    var body = new FormData();
    body.set('prompt', prompt);
    var res = await fetch('/chat', { method: 'POST', body: body });

    // If agent was busy, message was queued
    var ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      showQueue('Queued as follow-up...');
      streaming = false;
      return;
    }

    await readSSE(res);
  } catch (err) {
    streamDiv.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">' + err.message + '</div>';
  }
  finishStream();
}

async function readSSE(res) {
  var reader = res.body.getReader();
  var decoder = new TextDecoder();
  var buf = '';
  while (true) {
    var chunk = await reader.read();
    if (chunk.done) break;
    buf += decoder.decode(chunk.value, { stream: true });
    var parts = buf.split('\\n\\n');
    buf = parts.pop() || '';
    for (var i = 0; i < parts.length; i++) {
      var lines = parts[i].split('\\n').filter(function(l) { return l.startsWith('data: '); }).map(function(l) { return l.slice(6); });
      var html = lines.join('\\n');
      if (html) {
        streamDiv.innerHTML = html;
        streamDiv.querySelectorAll('link[rel=stylesheet]').forEach(function(old) {
          if (!document.querySelector('link[href="' + old.getAttribute('href') + '"]')) {
            var l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = old.getAttribute('href');
            document.head.appendChild(l);
          }
        });
        (function execScripts(el) {
          var scripts = [].slice.call(el.querySelectorAll('script'));
          var idx = 0;
          function next() {
            if (idx >= scripts.length) { if (typeof htmx !== 'undefined') htmx.process(el); return; }
            var old = scripts[idx++];
            var s = document.createElement('script');
            if (old.src) { s.src = old.src; s.onload = next; s.onerror = next; }
            else { s.textContent = old.textContent; setTimeout(next, 0); }
            old.replaceWith(s);
          }
          next();
        })(streamDiv);
        messages.scrollTop = messages.scrollHeight;
      }
    }
  }
}

function finishStream() {
  while (streamDiv.firstChild) {
    messages.insertBefore(streamDiv.firstChild, streamDiv);
  }
  updateStats();
  streaming = false;
  showQueue('');
  textarea.placeholder = 'Enter — send · Ctrl+Enter — steer · Esc — stop';
  textarea.focus();
}

document.getElementById('chat-form').addEventListener('submit', function(e) {
  e.preventDefault();
  var prompt = textarea.value.trim();
  if (!prompt) return;

  if (streaming) {
    var body = new FormData();
    body.set('prompt', prompt);
    addUserBubble(prompt, 'Follow-up');
    textarea.value = '';
    fetch('/chat', { method: 'POST', body: body });
    showQueue('Follow-up queued...');
  } else {
    runStream(prompt);
  }
});

// Reconnect to running stream if session is streaming
(function reconnect() {
  var page = document.querySelector('[data-page=chat]');
  if (!page || page.dataset.streaming !== 'true') return;
  var sessionFile = page.dataset.session;
  if (!sessionFile) return;

  streaming = true;
  textarea.placeholder = 'Enter — queue follow-up · Ctrl+Enter — steer · Esc — stop';

  fetch('/session/' + encodeURIComponent(sessionFile) + '/stream')
    .then(function(res) {
      if (res.status === 204) { streaming = false; return; }
      return readSSE(res);
    })
    .then(finishStream)
    .catch(function() { streaming = false; });
})();
`;
