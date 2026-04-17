// Built-in editor widget — served by the web server, not as CGI
// GET /w/editor/?file=path — render CodeMirror editor
// POST /w/editor/save — save file content

import { resolve } from "node:path";

export default async function widget_editor(req: Request, cwd: string): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/w\/editor\/?/, "/") || "/";

  if (req.method === "GET" && (path === "/" || path === "")) {
    const filePath = url.searchParams.get("file") || "";
    const html = await renderEditor(cwd, filePath);
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (req.method === "POST" && path === "/save") {
    const form = await req.formData();
    const filePath = form.get("file") as string;
    const content = form.get("content") as string;
    if (!filePath || content === null) {
      return new Response(`<span style="color:#dc2626">Missing file or content</span>`, { headers: { "Content-Type": "text/html" } });
    }
    const fullPath = filePath.startsWith("/") ? filePath : resolve(cwd, filePath);
    try {
      await Bun.write(fullPath, content);
      const bytes = Buffer.byteLength(content, "utf-8");
      return new Response(`<span style="color:#16a34a">✓ Saved (${bytes}B)</span>`, { headers: { "Content-Type": "text/html" } });
    } catch (e: any) {
      return new Response(`<span style="color:#dc2626">Error: ${Bun.escapeHTML(e.message)}</span>`, { headers: { "Content-Type": "text/html" } });
    }
  }

  return new Response("Not found", { status: 404 });
}

async function renderEditor(cwd: string, filePath: string): Promise<string> {
  if (!filePath) {
    return `<div class="hyper-ui"><div class="alert alert-error">No file specified. Use ?file=path</div></div>`;
  }

  const fullPath = filePath.startsWith("/") ? filePath : resolve(cwd, filePath);
  let content = "";
  try {
    const file = Bun.file(fullPath);
    if (await file.exists()) content = await file.text();
  } catch (e: any) {
    return `<div class="hyper-ui"><div class="alert alert-error">${Bun.escapeHTML(e.message)}</div></div>`;
  }

  const ext = filePath.split(".").pop()?.toLowerCase() || "text";
  const langMap: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", css: "css", html: "html", xml: "xml",
    py: "python", rb: "ruby", go: "go", rs: "rust",
    java: "java", yaml: "yaml", yml: "yaml", md: "markdown",
    sh: "shell", bash: "shell", sql: "sql", toml: "toml",
  };
  const lang = langMap[ext] || "text";
  const escaped = content.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");

  return `<div class="hyper-ui" id="widget-editor" data-entity="widget" data-id="editor">
<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px">
  <span style="font-size:13px;font-weight:600;color:#374151">📝 ${Bun.escapeHTML(filePath)}</span>
  <span class="badge badge-gray" style="margin-left:auto">${lang}</span>
</div>
<div id="cm-editor-wrap" style="border:1px solid #d1d5db;border-radius:6px;overflow:hidden"></div>
<div style="margin-top:8px;display:flex;gap:8px;align-items:center">
  <button id="cm-save-btn" onclick="cmSave()">Save</button>
  <button class="secondary" onclick="cmRevert()">Revert</button>
  <span id="cm-status" style="font-size:12px;color:#6b7280"></span>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/theme/github-dark.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/javascript/javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/python/python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/shell/shell.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/css/css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/xml/xml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/htmlmixed/htmlmixed.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/markdown/markdown.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/sql/sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/yaml/yaml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/toml/toml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/go/go.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/rust/rust.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/mode/ruby/ruby.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/addon/edit/matchbrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/addon/edit/closebrackets.min.js"></script>
<script>
(function() {
  var cmModeMap = {
    typescript: "text/typescript", javascript: "javascript", json: "application/json",
    css: "text/css", html: "htmlmixed", xml: "xml", python: "python",
    ruby: "ruby", go: "go", rust: "rust", shell: "shell",
    markdown: "markdown", sql: "sql", yaml: "yaml", toml: "toml", text: "text"
  };
  var originalContent = \`${escaped}\`;
  var cm = CodeMirror(document.getElementById("cm-editor-wrap"), {
    value: originalContent,
    mode: cmModeMap["${lang}"] || "text",
    theme: "github-dark",
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    tabSize: 2,
    indentWithTabs: false,
    lineWrapping: false,
    viewportMargin: Infinity
  });
  cm.setSize(null, Math.min(Math.max(cm.lineCount() * 20 + 20, 120), 500));
  window.cmSave = function() {
    var btn = document.getElementById("cm-save-btn");
    var status = document.getElementById("cm-status");
    btn.disabled = true; btn.textContent = "Saving...";
    var body = new FormData();
    body.set("file", "${Bun.escapeHTML(filePath)}");
    body.set("content", cm.getValue());
    fetch("/w/editor/save", { method: "POST", body: body })
      .then(function(r) { return r.text(); })
      .then(function(html) { status.innerHTML = html; originalContent = cm.getValue(); btn.disabled = false; btn.textContent = "Save"; })
      .catch(function(e) { status.textContent = "Error: " + e.message; btn.disabled = false; btn.textContent = "Save"; });
  };
  window.cmRevert = function() { cm.setValue(originalContent); document.getElementById("cm-status").textContent = "Reverted"; };
  cm.setOption("extraKeys", { "Ctrl-S": function() { window.cmSave(); } });
})();
</script>
</div>`;
}
