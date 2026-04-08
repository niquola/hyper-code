# Hyper Code

Web-based coding agent with htmx SSR UI. Chat with an LLM that can read, write, edit files and run shell commands — all through the browser.

## Quick Start

```bash
bun install

# Start LM Studio with qwen3-coder-next (or any OpenAI-compatible model)

# Run server
bun --hot server.ts

# Open http://localhost:$(cat .port)
```

## Architecture

Procedural style — one function per file, flat structure, no classes, no frameworks.

```
ls ai_*.ts          # LLM streaming layer (OpenAI-compatible)
ls agent_*.ts       # Agent loop (prompt → LLM → tools → repeat)
ls tool_*.ts        # Coding tools (read, write, edit, bash)
ls chat_*.ts*       # Web chat UI (SSE streaming, views)
ls page_*.tsx       # Page routes
ls form_*.tsx       # Form handlers
ls UI_*.tsx         # Reusable UI components
```

### Layers

**ai** — LLM streaming via OpenAI-compatible APIs. Streams token-by-token, handles tool calls, calculates costs. Works with OpenAI, LM Studio, Groq, OpenRouter, etc.

```
ai_stream.ts              → ai_stream(model, context, opts) returns event stream
ai_type_Message.ts        → Message, AssistantMessage, ToolCall, Usage
ai_type_Model.ts          → Model (provider, baseUrl, costs)
ai_EventStream.ts         → async iterable push stream
ai_convertMessages.ts     → convert to OpenAI format
ai_renderMarkdown.ts      → markdown → HTML with shiki syntax highlighting
```

**agent** — Agent loop. Takes a prompt, calls LLM, executes tool calls, loops until done.

```
agent_run.ts              → agent_run(ctx, prompt, onEvent) — the loop
agent_type_Ctx.ts         → Ctx: model, apiKey, messages, tools, state
agent_createCtx.ts        → create ctx with defaults
agent_executeTools.ts     → run tools sequentially
agent_abort.ts            → cancel via AbortController
```

**tools** — Coding tools the agent can use.

```
tool_read.ts              → read file contents (with line numbers)
tool_write.ts             → create/overwrite file
tool_edit.ts              → exact text replacement
tool_bash.ts              → execute shell commands
tool_grep.ts              → search file contents (ripgrep)
tool_find.ts              → find files by glob (Bun.Glob)
tool_ls.ts                → list directory contents
tool_hyper_ui.ts          → list/show interactive HTML widgets
```

**hyper_ui** — Interactive HTML widgets (CGI 2026).

```
hyper_ui_run.ts           → CGI runner: env vars + stdin → stdout HTML
hyper_ui_list.ts          → list *.hyper_ui.* scripts in workspace
hyper_ui_route.ts         → HTTP handler for /ui/{name}/*
```

Any `.hyper_ui.ts` (or `.py`, `.sh`) file in the workspace is a CGI script.
The agent can create widgets, show them in chat, and users interact via htmx forms.
Widgets can dispatch messages back to the agent via POST /dispatch.

**chat** — Web UI. SSR with htmx, SSE for streaming.

```
chat_ctx.ts               → shared agent context (model, tools, messages)
chat_sse.ts               → agent events → SSE HTML stream
chat_settings.ts          → persistent provider/model/API key config
chat_view_page.tsx        → chat page layout + JS
chat_view_message.tsx     → render messages (user, assistant, tool)
chat_view_settings.tsx    → settings page (provider, model, API key)
chat_view_stats.tsx       → token usage display
form_chat_POST.tsx        → POST /chat → starts agent, returns SSE
page_index.tsx            → GET / → chat page with history
page_settings.tsx         → GET /settings → settings page
```

**web infra** — JSX runtime, router, layout, UI components.

```
jsx.ts                    → JSX → HTML string (no React)
router_buildRoutes.ts     → auto-discover page/frag/form/api routes
layout_view_page.tsx      → HTML shell (htmx, tailwind, shiki)
server.ts                 → Bun.serve on random port, saves .port
UI_Button.tsx             → button variants
UI_Input/Textarea/...     → form components
```

**testing** — CDP browser testing + data attributes.

```
cdp_server.ts             → HTTP → Chrome DevTools proxy
cdp.ts                    → navigate, click, fill, submit, screenshot
cdp_pageState.ts          → parse data-* attributes from HTML
pageState_script.ts       → browser-side __pageState() for CDP
test_html.ts              → HTML query helpers for unit tests
```

## How It Works

1. User types prompt in browser, JS intercepts form submit
2. `POST /chat` starts `agent_run(ctx, prompt, onEvent)`
3. Agent calls LLM via `ai_stream()`, gets streaming response
4. Events stream as SSE → HTML fragments swap into page live
5. If LLM calls tools → agent executes them, adds results, loops back to LLM
6. On completion: final render with markdown + shiki code highlighting
7. Tool outputs shown as collapsible blocks with syntax highlighting

## hyper_ui — Interactive Widgets

CGI-style widgets that the agent can create. A `.hyper_ui.ts` script reads request from env vars and writes HTML to stdout. htmx handles interaction — no client JS needed.

**Three interaction patterns:**

1. **Tool HTML response** — tool returns `{ type: "html", html: "..." }`, rendered inline in chat
2. **CGI widget** — `.hyper_ui.ts` file served at `/ui/{name}/`, full htmx interactivity
3. **Dispatch** — widget POSTs to `/dispatch`, message goes back to agent

**Creating a widget:**

```ts
// tasks.hyper_ui.ts
const method = process.env.REQUEST_METHOD || "GET";
const path = process.env.PATH_INFO || "/";
const file = Bun.file(process.env.WORKSPACE_DIR + "/.tasks.json");
let tasks = await file.exists() ? await file.json() : [];

if (method === "GET") {
  console.log(`<h2>Tasks (${tasks.length})</h2>`);
  for (const t of tasks) console.log(`<div>${t.done ? "✅" : "⬜"} ${t.title}</div>`);
  console.log(`<form hx-post="/ui/tasks/add" hx-target="#hyper-ui-tasks" hx-swap="innerHTML">
    <input name="title" /><button>Add</button>
  </form>`);
} else if (method === "POST" && path === "/add") {
  const params = new URLSearchParams(await Bun.stdin.text());
  tasks.push({ title: params.get("title"), done: false });
  await Bun.write(file, JSON.stringify(tasks));
  console.log(`<div>Added! Total: ${tasks.length}</div>`);
}
```

**CGI env vars:**

| Variable | What |
|----------|------|
| `REQUEST_METHOD` | GET, POST |
| `PATH_INFO` | path after widget name (`/`, `/add`) |
| `QUERY_STRING` | URL parameters |
| `WORKSPACE_DIR` | workspace root directory |
| `HYPER_UI_ID` | container div id for htmx targeting |
| `stdin` | POST body |

**Dispatch (widget → agent):**

```html
<form hx-post="/dispatch" hx-swap="outerHTML">
  <input type="hidden" name="text" value="User approved the changes" />
  <button type="submit">Approve</button>
</form>
```

Always use `hx-post` (htmx), not plain `action` — to stay in chat without page navigation.

## Data Attributes

Views use `data-*` attributes for testing and CDP automation:

| Attribute | Example values |
|-----------|---------------|
| `data-page` | `chat` |
| `data-entity` | `message`, `tool` |
| `data-status` | `user`, `assistant`, `running`, `done`, `error` |
| `data-role` | `label`, `content`, `thinking`, `tool-name`, `tool-args`, `tool-result` |
| `data-action` | `send` |
| `data-form` | `prompt` |

## Commands

```bash
bun --hot server.ts          # dev server (random port, see .port)
bun run test                 # run tests
bun run typecheck            # tsc --noEmit
```

## Stack

- [Bun](https://bun.sh) — runtime, server, test runner
- [htmx](https://htmx.org) — HTML over the wire
- [Tailwind CSS](https://tailwindcss.com) — utility CSS (CDN)
- [Shiki](https://shiki.style) — syntax highlighting
- Custom JSX → HTML string runtime (no React)
- OpenAI-compatible LLM API (LM Studio, OpenAI, Groq, etc.)
