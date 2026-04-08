import type { Message } from "./ai_type_Message.ts";
import { chat_view_userMessage, chat_view_assistantMessage, chat_view_toolCall } from "./chat_view_message.tsx";
import { chat_view_stats } from "./chat_view_stats.tsx";

export async function chat_view_page(messages: Message[]): Promise<string> {
  const rendered: string[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      const content = typeof msg.content === "string" ? msg.content : msg.content.map((c) => c.type === "text" ? c.text : "[image]").join("");
      rendered.push(chat_view_userMessage(content));
    } else if (msg.role === "assistant") {
      const text = msg.content.filter((c) => c.type === "text").map((c) => (c as any).text).join("");
      const thinking = msg.content.filter((c) => c.type === "thinking").map((c) => (c as any).thinking).join("");
      rendered.push(await chat_view_assistantMessage(text, thinking || undefined));
    } else if (msg.role === "toolResult") {
      const result = msg.content.map((c) => c.type === "text" ? (c as any).text : "[image]").join("\n");
      rendered.push(chat_view_toolCall(msg.toolName, "", result, msg.isError));
    }
  }
  return (
    <div data-page="chat" className="flex flex-col" style="height: calc(100vh - 60px)">
      <div id="messages" className="flex-1 overflow-y-auto pb-4">
        {rendered.join("")}
        <div id="stream"></div>
      </div>
      {chat_view_stats(messages)}
      <div id="input-area" className="border-t border-gray-200 pt-4 pb-2">
        <form id="chat-form" data-form="prompt" method="POST" action="/chat">
          <div className="flex gap-2">
            <textarea
              name="prompt"
              rows="2"
              required
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();this.form.requestSubmit()}"
            ></textarea>
            <button
              id="send-btn"
              type="submit"
              data-action="send"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition self-end"
            >Send</button>
            <button
              id="abort-btn"
              type="button"
              data-action="abort"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition self-end hidden"
              onclick="fetch('/abort',{method:'POST'}).then(()=>window.location.reload())"
            >Stop</button>
          </div>
        </form>
      </div>
      <script dangerouslySetInnerHTML={{ __html: CHAT_SCRIPT }} />
    </div>
  );
}

const CHAT_SCRIPT = `
document.getElementById('chat-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var form = e.target;
  var textarea = form.querySelector('textarea');
  var btn = form.querySelector('#send-btn');
  var abortBtn = document.getElementById('abort-btn');
  var prompt = textarea.value.trim();
  if (!prompt) return;

  // Disable input, show abort
  textarea.disabled = true;
  btn.disabled = true;
  btn.classList.add('hidden');
  abortBtn.classList.remove('hidden');
  form.setAttribute('data-status', 'streaming');

  // Add user message to UI
  var messages = document.getElementById('messages');
  var esc = function(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  var userDiv = document.createElement('div');
  userDiv.setAttribute('data-entity', 'message');
  userDiv.setAttribute('data-status', 'user');
  userDiv.className = 'mb-4';
  userDiv.innerHTML = '<div class="text-xs font-medium text-gray-500 mb-1" data-role="label">You</div><div class="bg-gray-100 rounded-lg px-4 py-3 text-gray-900 whitespace-pre-wrap" data-role="content">' + esc(prompt) + '</div>';
  var streamDiv = document.getElementById('stream');
  messages.insertBefore(userDiv, streamDiv);

  // Clear and scroll
  textarea.value = '';
  messages.scrollTop = messages.scrollHeight;

  // POST and read SSE stream
  try {
    var body = new FormData();
    body.set('prompt', prompt);
    var res = await fetch('/chat', { method: 'POST', body: body });
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
          messages.scrollTop = messages.scrollHeight;
        }
      }
    }
  } catch (err) {
    streamDiv.innerHTML = '<div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">' + err.message + '</div>';
  }

  // Move stream content before stream div as finalized messages
  while (streamDiv.firstChild) {
    messages.insertBefore(streamDiv.firstChild, streamDiv);
  }

  // Re-enable input, hide abort
  textarea.disabled = false;
  btn.disabled = false;
  btn.classList.remove('hidden');
  abortBtn.classList.add('hidden');
  form.removeAttribute('data-status');
  textarea.focus();
});
`;
