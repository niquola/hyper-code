// Client-side JS for chat page — SSE streaming, keyboard shortcuts, dialog dispatch
// Injected as <script> in chat_view_page.tsx

const CHAT_SCRIPT = `
var streaming = false;
var textarea = document.querySelector('#chat-form textarea');
var messages = document.getElementById('messages');
var streamDiv = document.getElementById('stream');
var queueInd = document.getElementById('queue-indicator');
var sessionCache = null;  // Cache for session list

// Get current session ID from page
function getCurrentSessionId() {
  var page = document.querySelector('[data-page=chat]');
  return page?.dataset.session || null;
}

// Fetch and cache session list
async function fetchSessions() {
  if (sessionCache) return sessionCache;
  try {
    var res = await fetch('/api/sessions');
    var data = await res.json();
    sessionCache = data.sessions || [];
    return sessionCache;
  } catch (e) {
    return [];
  }
}

// Clear session cache (call when sessions change)
function clearSessionCache() {
  sessionCache = null;
}

// Navigate to previous/next session
async function navigateSession(direction) {
  var sessions = await fetchSessions();
  if (sessions.length === 0) return;
  
  var currentId = getCurrentSessionId();
  if (!currentId) return;
  
  var currentIndex = sessions.findIndex(function(s) { return s.id === currentId; });
  if (currentIndex === -1) return;
  
  var newIndex;
  if (direction === 'prev') {
    newIndex = currentIndex > 0 ? currentIndex - 1 : sessions.length - 1;
  } else {
    newIndex = currentIndex < sessions.length - 1 ? currentIndex + 1 : 0;
  }
  
  var targetSession = sessions[newIndex];
  if (targetSession && targetSession.id !== currentId) {
    window.location.href = '/session/' + encodeURIComponent(targetSession.id) + '/';
  }
}

// Session-scoped URL helper
function sessionUrl(path) {
  var s = getCurrentSessionId();
  return s ? '/session/' + encodeURIComponent(s) + '/' + path : '/' + path;
}

function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function submitDialog(e, form) {
  e.preventDefault();
  var dlg = form.closest('dialog');
  var body = new FormData(form);
  dlg.remove();
  fetch(sessionUrl('dispatch'), { method: 'POST', body: body });
  return false;
}

function addUserBubble(text, label) {
  var div = document.createElement('div');
  div.setAttribute('data-entity', 'message');
  div.setAttribute('data-status', 'user');
  var cls = label === 'Steer' ? 'bg-orange-500 text-white' : 'bg-gray-500 text-white';
  div.className = 'mb-4 flex justify-end';
  div.innerHTML = '<div class="' + cls + ' rounded-2xl rounded-br-sm px-4 py-2 max-w-[80%] whitespace-pre-wrap" data-role="content">' + esc(text) + '</div>';
  streamDiv.parentNode.insertBefore(div, streamDiv);
  messages.scrollTop = messages.scrollHeight;
}

function updateStats() {
  fetch(sessionUrl('stats')).then(function(r) { return r.text(); }).then(function(h) {
    var el = document.getElementById('nav-stats');
    if (el) el.outerHTML = h;
  });
}

function showQueue(text) {
  if (text) { queueInd.textContent = text; queueInd.classList.remove('hidden'); }
  else { queueInd.classList.add('hidden'); }
}

function handleKey(e) {
  // Global hotkeys (work anywhere)
  if (e.key === 'Escape') {
    if (streaming) fetch(sessionUrl('abort'), { method: 'POST' }).then(function() { location.reload(); });
    return;
  }
  
  // Ctrl+Shift+[ — previous session
  if (e.key === '{' && e.ctrlKey && e.shiftKey) {
    e.preventDefault();
    navigateSession('prev');
    return;
  }
  
  // Ctrl+Shift+] — next session
  if (e.key === '}' && e.ctrlKey && e.shiftKey) {
    e.preventDefault();
    navigateSession('next');
    return;
  }
  
  // Textarea-specific hotkeys
  if (e.target !== textarea) return;
  
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    document.getElementById('chat-form').requestSubmit();
    return;
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    var text = textarea.value.trim();
    if (!text || !streaming) return;
    textarea.value = '';
    addUserBubble(text, 'Steer');
    var body = new FormData();
    body.set('prompt', text);
    fetch(sessionUrl('steer'), { method: 'POST', body: body });
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
    var res = await fetch(sessionUrl('chat'), { method: 'POST', body: body });

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
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        tmp.querySelectorAll('dialog').forEach(function(dlg) {
          if (document.body.querySelector('dialog#' + CSS.escape(dlg.id))) dlg.remove();
        });
        streamDiv.innerHTML = tmp.innerHTML;
        streamDiv.querySelectorAll('dialog').forEach(function(dlg) {
          document.body.appendChild(dlg);
          if (typeof htmx !== 'undefined') htmx.process(dlg);
        });
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
    streamDiv.parentNode.insertBefore(streamDiv.firstChild, streamDiv);
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
    fetch(sessionUrl('chat'), { method: 'POST', body: body });
    showQueue('Follow-up queued...');
  } else {
    runStream(prompt);
  }
});

// Reconnect to running stream
function connectStream() {
  if (!document.querySelector('[data-page=chat]')?.dataset.session) return;

  streaming = true;
  textarea.placeholder = 'Enter — queue follow-up · Ctrl+Enter — steer · Esc — stop';

  fetch(sessionUrl('stream'))
    .then(function(res) {
      if (res.status === 204) { streaming = false; return; }
      return readSSE(res);
    })
    .then(finishStream)
    .catch(function() { streaming = false; });
}

// On load: scroll to bottom, focus input, load stats, reconnect if streaming
(function() {
  messages.scrollTop = messages.scrollHeight;
  textarea.focus();
  updateStats();
  var page = document.querySelector('[data-page=chat]');
  if (page && page.dataset.streaming === 'true') connectStream();
  
  // Global keyboard handler for hotkeys
  document.addEventListener('keydown', handleKey);
})();

// Reconnect when dispatch triggers agent
document.body.addEventListener('dispatch-sent', function() {
  setTimeout(connectStream, 100);
});
`;
export default CHAT_SCRIPT;
