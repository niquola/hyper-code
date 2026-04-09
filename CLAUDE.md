---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

## Project — Hyper Code

Web-based coding agent with htmx UI. User interacts with an AI agent through the browser — send prompts, see responses, watch tool execution (file reads, edits, shell commands).

## Style — Agent on Procs

Procedural web framework. The key building blocks are **functions** and **types**. No classes, no frameworks, no magic — just procedures, explicit parameters, and flat file structure that an agent can navigate by `ls`.

- Each function and each type goes in its own file.
- File naming convention: `<module>_<functionName>.ts`. A directory listing is the full inventory.
  - Functions: `<module>_<functionName>.ts`
  - Views: `<module>_view_<name>.tsx`
  - Types: `<module>_type_<typeName>.ts`
  - Pages: `page_<path>.tsx` — GET, full HTML with layout
  - Fragments: `frag_<path>.tsx` — GET, HTML fragment for htmx swap (no layout)
  - Form handlers: `form_<path>_<METHOD>.tsx` — POST/PUT/DELETE, form submit → redirect
  - REST API: `api_<path>_<METHOD>.tsx` — JSON endpoints (e.g. `api_status_GET.tsx` → `/api/status`)
  - UI components: `UI_<ComponentName>.tsx` — reusable SSR components, called as JSX tags
  - Barrel: `<module>.ts` — re-exports all module functions
  - Names should be self-descriptive so you can understand what it does without opening the file.

## Navigating the codebase with `ls`

The flat file structure means `ls` is your primary navigation tool:

```sh
ls *.ts *.tsx                  # everything
ls ai_*.ts                     # LLM streaming layer
ls agent_*.ts                  # agent loop
ls tool_*.ts                   # coding tools (read, write, edit, bash)
ls chat_*.ts chat_*.tsx        # chat web UI
ls *_view_*.tsx                # all views
ls *_type_*.ts                 # all types
ls page_*.tsx                  # all pages (layout wrapped)
ls frag_*.tsx                  # all htmx fragments
ls form_*.tsx                  # all form handlers (POST → redirect)
ls api_*.tsx                   # all REST JSON endpoints (/api/* paths)
ls *.test.ts *.test.tsx        # all tests
ls UI_*.tsx                    # all UI components
ls cdp*.ts                     # CDP browser testing
```

**Reading the web app from filenames:**
- `ls page_*.tsx frag_*.tsx form_*.tsx` = full web surface
- `ls *_view_*.tsx` = all UI pages/components
- `ls *_type_*.ts` = domain model
- `ls <module>.ts` = module boundaries (barrels)
- Functions take everything they need as parameters — no hidden internal state, no singletons, no closures over mutable variables.
- Prefer explicit data flow: pass dependencies in, return results out.
- **Don't do extra.** Don't add features, abstractions, or "improvements" beyond what was asked. Don't guess requirements — ask.
- **Interview before building.** When a new feature is requested, first gather minimal requirements and use cases. Ask: what exactly should it do? Who uses it? What's the simplest version? Don't jump into coding — clarify scope first.
- **Strict TDD.** Always write tests BEFORE implementing the function. Red → Green → Refactor. No exceptions.
  - Module tests: `<module>.test.ts` — tests for the whole module
  - Unit tests: `<module>_<function>.test.ts` — tests for a single function
  - View tests: `<module>_view.test.tsx` or `<module>_view_<name>.test.tsx`

## Stack docs

Indexes are in `docs/`, full docs in submodules. Read index first, grep full docs when you need details.

| Index | Full docs | What |
|-------|-----------|------|
| [docs/bun.md](docs/bun.md) | `docs/bun_reference/` (330 mdx) | Bun runtime, APIs, prefer built-in over npm |
| [docs/htmx.md](docs/htmx.md) | `docs/htmx_reference/www/content/` (185 md) | htmx attributes, swap, triggers, examples |
| [docs/tailwind.md](docs/tailwind.md) | `docs/tailwind_reference/src/docs/` (192 mdx) | Tailwind CSS utility classes |
| [docs/datastar.md](docs/datastar.md) | `docs/datastar_reference/` (74 examples) | Datastar — reactive signals + SSE for complex UI |

### htmx vs Datastar

**htmx by default** — simple request/response: click → server HTML → swap. Forms, navigation, CRUD.

**Datastar when htmx isn't enough** — reactive client state, real-time updates, complex UI:
- Client-side reactivity (signals, computed values, conditional show/hide)
- Real-time SSE streaming from server
- Two-way data binding on forms
- Complex state management across multiple elements
- Loading indicators tied to request state
- Cascading updates (one change triggers multiple UI updates)

Both can coexist on the same page. htmx uses `hx-*` attributes, Datastar uses `data-*` attributes.

**When to pick which:**
| Use case | Pick |
|----------|------|
| Form submit → redirect | htmx |
| Click → swap HTML fragment | htmx |
| Live search with debounce | Datastar |
| Show/hide without server | Datastar |
| Real-time updates (SSE) | Datastar |
| Loading spinners | Datastar (`data-indicator`) |
| Two-way form binding | Datastar (`data-bind`) |
| Streaming agent output | Datastar (SSE) |

## Modules

**ai** — LLM streaming via OpenAI-compatible APIs (OpenAI, LM Studio, Groq, etc.)
- `ai_stream(model, context, opts)` → `AssistantMessageEventStream` (async iterable)
- Auto-routes: Codex → `ai_streamCodex` (raw fetch), OpenAI/GitHub → `ai_streamResponses`, others → Completions API
- Types: `Message`, `AssistantMessage`, `ToolCall`, `Usage`, `Model`, `StreamOptions`
- `ai_renderMarkdown(text)` → HTML with shiki syntax highlighting
- `ai_models_generated.ts` — 856 models across 23 providers

**agent** — Agent loop: prompt → LLM → tool execution → repeat
- `agent_run(ctx, session, prompt, onEvent)` — main loop, emits `AgentEvent`s
- `Ctx` holds: model, apiKey, systemPrompt, tools (immutable config)
- `Session` holds: filename, messages, steerQueue, followUpQueue, abortController, isStreaming, sseListeners
- `agent_createCtx(opts)` — create config with defaults
- `agent_executeTools(ctx, toolCalls, onEvent, signal?)` — sequential tool execution
- `agent_abort(session)` — abort running agent
- `agent_reset(session)` — clear session state

**tools** — Coding tools (read, write, edit, bash, grep, find, ls, hyper_ui)
- `tool_read(cwd)` — read file with line numbers, offset/limit
- `tool_write(cwd)` — create/overwrite file
- `tool_edit(cwd)` — exact text replacement (oldText must be unique)
- `tool_bash(cwd)` — run shell command with timeout
- `tool_grep(cwd)` — search file contents with regex (ripgrep)
- `tool_find(cwd)` — find files by glob pattern (Bun.Glob)
- `tool_ls(cwd)` — list directory contents
- `tool_hyper_ui(cwd)` — list/show interactive HTML widgets

**hyper_ui** — Interactive HTML widgets (CGI style)
- Agent creates `hyper_ui_<name>.ts` (or `.py`, `.sh`) scripts
- Scripts read env vars (`REQUEST_METHOD`, `PATH_INFO`, `QUERY_STRING`, `WORKSPACE_DIR`) + stdin
- Scripts write HTML to stdout
- Served at `/ui/{name}/*`, htmx handles all interaction
- Tools can return `{ type: "html", html: "..." }` for inline HTML in chat
- POST `/dispatch` sends user interaction back to agent
- `hyper_ui_run(cwd, name, req)` — CGI runner
- `hyper_ui_list(cwd)` — list available widgets
- `hyper_ui_route.ts` — HTTP handler for `/ui/*`

**chat** — Web UI with SSE streaming
- `Ctx` — agent config (model, apiKey, systemPrompt, tools). Immutable per server lifetime.
- `Session` — conversation state (filename, messages, queues, abortController, isStreaming). One per chat session.
- `agent_run(ctx, session, prompt, onEvent)` — main agent loop with explicit config + state
- `chat_getCtx()` — lazy-init shared agent config
- `chat_getSession()` — lazy-init current session (loads latest non-empty from `.hyper/`)
- `chat_switchSession(filename)` — switch to a different session
- `chat_createSSEStream(runAgent)` — agent events → SSE HTML fragments
- `chat_settings.ts` — persistent provider/model/API key config (.settings.json)
- `chat_session.ts` — session persistence (`.hyper/<timestamp>-<id>.jsonl`), title management
- `chat_type_Session.ts` — Session type definition
- Views: `chat_view_page`, `chat_view_message`, `chat_view_settings`

**Session management**
- Sessions stored in `.hyper/` as JSONL files (one JSON message per line, append-only)
- Custom titles in `.hyper/<filename>.title` (optional, falls back to first user message)
- URL-based navigation: `/session/:filename`
- `/` redirects to latest non-empty session
- `/session/new` — form to create session (title, provider, model)
- Sidebar: dark panel with session list, delete (×), rename (dblclick)

**Steering & follow-up**
- Enter during streaming → follow-up (queued, runs after current turn)
- Ctrl+Enter during streaming → steer (injected into current context as `[STEER]`)
- Escape → abort
- Textarea always active during streaming

**Routes**
- `GET /` → redirect to `/session/:latest`
- `GET /session/new` → new session form
- `GET /session/:filename` → chat page for session
- `POST /chat` → send message (or queue follow-up if streaming)
- `POST /steer` → inject steer message
- `POST /abort` → abort current run
- `POST /session/create` → create session with optional title
- `POST /session/delete` → delete session
- `POST /session/rename` → set custom title
- `GET /sessions` → htmx fragment: session list for sidebar
- `GET /stats` → htmx fragment: token count + cost
- `GET /settings`, `POST /settings` — provider/model/API key config

## Calling Functions with `bun -e`

Since every function is pure and takes all dependencies as parameters, you can call any function directly from the command line using `bun -e`.

```sh
# stream from LLM
bun -e "import { ai_stream } from './ai.ts'; import { AI_MODELS } from './ai_models.ts';
const s = ai_stream(AI_MODELS['gpt-4o-mini']!, { messages: [{ role: 'user', content: 'Hi', timestamp: Date.now() }] }, { apiKey: process.env.OPENAI_API_KEY });
for await (const e of s) { if (e.type === 'text_delta') process.stdout.write(e.delta); }"

# run agent with tools (ctx = config, session = state)
bun -e "import { agent_createCtx, agent_run } from './agent.ts'; import { tool_read } from './tool_read.ts';
const ctx = agent_createCtx({ model: { id: 'qwen3-coder-next', name: 'Q', provider: 'lmstudio', baseUrl: 'http://localhost:1234/v1', reasoning: true, input: ['text'], cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }, contextWindow: 128000, maxTokens: 32000 }, apiKey: 'lm-studio', tools: [tool_read('.')] });
const session = { filename: 'test.jsonl', messages: [], steerQueue: [], followUpQueue: [], abortController: null, isStreaming: false };
await agent_run(ctx, session, 'Read server.ts', (e) => { if (e.type === 'text_delta') process.stdout.write(e.delta); });"
```

Prefer `bun -e` for quick validation during development. Use `bun run test` for persistent regression tests.

## Testing

Tests go in `<module>.test.ts` files.

```ts
test("my function", () => {
  const result = myFunction(...);
  expect(result).toBe(...);
});
```

Views are tested the same way — no server, no browser needed. Since views are just `(data) → string`, test the HTML output directly.

## Data attribute language

Every view is annotated with `data-*` attributes that describe the page for agents and tests. No CSS classes for selectors — only data attributes.

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `data-page` | Page identity (one per page) | `chat`, `home` |
| `data-entity` | Entity type | `message`, `file` |
| `data-id` | Entity ID | uuid |
| `data-status` | Entity state | `streaming`, `done` |
| `data-role` | Semantic field inside entity | `content`, `tool-name` |
| `data-action` | Clickable action | `send`, `cancel`, `retry` |
| `data-form` | Named form | `prompt`, `settings` |

### pageState() — unified helper for tests and CDP

`cdp_pageState.ts` exports `pageState(html)` for tests and generates CDP command for browser.

**In tests** — parse HTML string into structured state:
```ts
import { pageState } from "./cdp_pageState.ts";

test("chat page", () => {
  const html = chat_view_page(messages);
  const state = pageState(html);
  expect(state.page).toBe("chat");
  expect(state.forms[0]!.name).toBe("prompt");
});
```

Same data model in tests and CDP — write once, assert everywhere.

Logic tests go in `<module>.test.ts`, view tests in `<module>_view.test.tsx`.

**Testing HTTP handlers** — handlers are just functions `(req, params) → string | Response | null`. Call them directly in tests without a running server:
```ts
import page_index from "./page_index.tsx";

test("GET / renders home page", async () => {
  const req = new Request("http://localhost/");
  const result = await page_index(req);
  expect(typeof result).toBe("string");
});
```

Run: `bun run test` (all tests) or `bun test chat.test.ts` (single file).

## Typecheck

Strict TypeScript checking via `bun run typecheck` (runs `tsc --noEmit`). `docs/` excluded from checking.

Run typecheck after changes to catch type errors early.

## UI components (`UI_*.tsx`)

Reusable SSR components. PascalCase so they work as JSX tags:

```tsx
import { UI_Button } from "./UI_Button.tsx";
import { UI_Input } from "./UI_Input.tsx";
import { UI_Textarea } from "./UI_Textarea.tsx";
import { UI_Alert } from "./UI_Alert.tsx";

<UI_Button action="send" type="submit" variant="primary">Send</UI_Button>
<UI_Input name="prompt" placeholder="Ask something..." />
<UI_Textarea name="body" label="Message" rows={4} />
<UI_Alert message="Error text" variant="error" />
```

**Button variants:** `primary` (dark), `success` (green), `danger` (red), `outline` (bordered), `ghost` (text only)

`ls UI_*.tsx` — all UI components.

## JSX runtime

Custom JSX → HTML string renderer. No React, no virtual DOM.

- `jsx.ts` + `jsx-runtime.ts` + `jsx-dev-runtime.ts` — the runtime
- `tsconfig.json`: `"jsx": "react-jsx"`, `"jsxImportSource": "."`
- Use `className` (not `class`) — JSX convention
- `dangerouslySetInnerHTML={{ __html: htmlString }}` — inject raw HTML
- Boolean attributes: `<option selected={condition}>` — renders `selected` or omits
- JSX returns `string`, not React elements — can concatenate, return from functions, test directly

## Error handling

Handlers return `string | Response | null`. Error patterns:

- **Validation errors** — re-render with error message
- **Not found** — return `null` (router sends 404)
- **Redirect** — return `new Response(null, { status: 302, headers: { Location: "/path" } })`

## Views (SSR)

Server-side HTML rendering via custom JSX runtime. Components are pure functions: `(props) → string`.

- File naming: `<module>_view_<name>.tsx`
- Use htmx attributes (`hx-get`, `hx-post`, `hx-swap`, `hx-target`) for interactivity

**Split logic and rendering.** A page/endpoint is always two functions — one does the logic, the other renders HTML.

```tsx
// page_chat.tsx — handler wires logic + view
export default async function(req: Request) {
  const messages = getMessages();
  return layout_view_page("Chat", chat_view_page(messages));
}
```

## Routes

Four kinds of route files. `$param` in filename becomes `:param` in route.

**Pages** (`page_*.tsx`) — GET, full HTML wrapped in layout:
```
page_index.tsx                    → GET /
page_chat.tsx                     → GET /chat
page_chat_$id.tsx                 → GET /chat/:id
```

**Fragments** (`frag_*.tsx`) — GET, HTML fragment for htmx swap (no layout):
```
frag_chat_messages.tsx            → GET /chat/messages
```

**Form handlers** (`form_*.tsx`) — POST/PUT/DELETE, form submit → redirect:
```
form_chat_POST.tsx                → POST /chat
```

**REST API** (`api_*.tsx`) — JSON endpoints, automatically under `/api/` path:
```
api_status_GET.tsx                → GET /api/status (JSON)
```

Each file exports `(req, params) → string | Response | null`.

`router_buildRoutes.ts` auto-discovers `page_*.tsx`, `frag_*.tsx`, `form_*.tsx`, `api_*.tsx`.

## Server

Run dev server in tmux:

```sh
# start
tmux kill-session -t "$(basename $PWD)" 2>/dev/null; tmux new-session -d -s "$(basename $PWD)" 'bun --hot server.ts'

# logs
tmux capture-pane -t "$(basename $PWD)" -p -S -30

# stop
tmux kill-session -t "$(basename $PWD)"

# get port
cat .port
```

Server picks a random port on start and writes it to `.port`. Use `cat .port` to discover the port for curl/fetch/CDP.

**Restart the server after every change** — hot reload is not always reliable, especially after adding new route files.

## UI testing with CDP

Chrome DevTools Protocol for browser testing. CDP server + Chrome profile are per-project.

```sh
# start CDP server (once per project)
tmux new-session -d -s "$(basename $PWD)-cdp" 'CDP_PORT=2230 CDP_CHROME_PORT=9223 bun cdp_server.ts'
```

### cdp.ts helper

`cdp.ts` wraps CDP into async functions. Use via `bun -e`:

```sh
# read page state
bun -e "import {cdp} from './cdp.ts'; await cdp.navigate('/'); console.log(await cdp.pageState())"

# click action
bun -e "import {cdp} from './cdp.ts'; await cdp.click('[data-action=send]')"

# fill form and submit
bun -e "import {cdp} from './cdp.ts'; await cdp.fill('[data-form=prompt] textarea[name=body]', 'Hello'); await cdp.submit('[data-form=prompt]')"

# screenshot
bun -e "import {cdp} from './cdp.ts'; await cdp.screenshot('/tmp/screen.png')"
```

**API:** `navigate(path)`, `pageState()`, `click(sel)`, `fill(sel, val)`, `submit(formSel)`, `select(sel, val)`, `screenshot(path)`, `text(sel)`

### When to use what

| Need | Tool |
|------|------|
| Page content/state | `cdp.pageState()` or `pageState(html)` in tests |
| Click/fill/submit | `cdp.click()`, `cdp.fill()`, `cdp.submit()` |
| Visual check | `cdp.screenshot()` |
| Unit/logic tests | `bun run test` (no browser) |

**Prefer `pageState` over screenshots** — faster, deterministic, no image parsing.

## Adding a new tool

1. Create `tool_<name>.ts` exporting a function `tool_<name>(cwd: string): AgentTool`
2. Return `{ name, description, parameters (JSON Schema), execute(params, signal) }`
3. Tools can return `{ type: "text", text }`, `{ type: "image", data, mimeType }`, or `{ type: "html", html }` content
4. HTML content renders inline in chat without escaping — use for interactive widgets
5. Add to `chat_ctx.ts` tools array
6. Write tests in `tool_<name>.test.ts`
7. Restart server

## Adding a hyper_ui widget

1. Create `hyper_ui_<name>.ts` (or `.py`, `.sh`) in workspace
2. Script reads `REQUEST_METHOD`, `PATH_INFO`, `QUERY_STRING` from env vars
3. POST body comes via stdin
4. Write HTML to stdout — htmx attributes work for interactivity
5. Use `hx-target="#hyper-ui-<name>"` for self-updating
6. Use `hx-post="/dispatch"` (not plain `action`) to send message back to agent — stays in chat
7. Agent can show widget via `tool_hyper_ui` with `action=show`
