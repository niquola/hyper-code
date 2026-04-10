---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

## Project — Hyper Code

Web-based coding agent with htmx SSR UI. Multi-session, multi-model, multi-provider. SQLite storage, sub-agents, interactive widgets, full-text search.

## Core Principles

1. **Procedural, not OOP** — `function(object, ...)` not `object.method()`. No classes, no `this`. Data is plain types, logic is free functions. One function/type per file.
2. **Ctx holds all state** — db, cwd, model, tools. No singletons, no `process.env` reads inside functions.
3. **URL determines screen** — session ID in URL, all actions scoped to URL session. Refresh = same state.
4. **Strict TDD** — write test FIRST. Bug found? Failing test FIRST, then fix.
5. **Light theme** — github-light shiki, no dark backgrounds.

## Agent Style & Behavior

- Each function and each type lives in its own file. Filenames should be self‑describing so you can understand what it does without opening the file.
- Functions take everything they need as parameters — **no hidden internal state**, no singletons, no closures over mutable variables. Prefer explicit data flow: pass dependencies in, return results out.
- **Don’t do extra.** Don’t add features, abstractions, or "improvements" beyond what was asked. If something feels like a nice extra, ask first.
- **Interview before building.** When a new feature is requested, first gather minimal requirements and use cases. Ask: what exactly should it do, who uses it, what’s the simplest version that works. Don’t jump into coding before the scope is clear.

## Testing Conventions

- Follow strict TDD: Red → Green → Refactor. Always write a failing test before changing behavior.
- Test file naming:
  - **Module tests:** `'<module>.test.ts'` — tests for a whole module.
  - **Function/unit tests:** `'<module>_<function>.test.ts'` — tests for a single function.
  - **View tests:** `'<module>_view.test.tsx'` or `'<module>_view_<name>.test.tsx'` — tests for rendered HTML.

## Docs & Navigation

- Use `ls` as the primary navigation tool — read the app structure from filenames (see **Navigating with `ls`** below).
- When using the large docs in `docs/`:
  - Start with the index files (e.g. `docs/bun.md`, `docs/htmx.md`) to understand the shape.
  - Then grep or open the corresponding reference directories (`docs/bun_reference/`, `docs/htmx_reference/`, etc.) when you need specific API details.

## Architecture

```
Browser ←→ Bun.serve (server.ts)
              │
              ├── Ctx (shared config: db, cwd, model, tools)
              ├── Sessions (per-conversation: messages, queues, streaming)
              ├── SQLite (.hyper/hyper.db) — sessions, messages, unread
              └── API Keys (~/.hyper/keys.json) — global, per-provider
```

**Ctx** = `{ db, cwd, model, apiKey, systemPrompt, tools }` — created once at startup, passed everywhere.
**Session** = `{ session_id, messages, model, apiKey, systemPrompt, steerQueue, followUpQueue, ... }` — per-conversation, mutable.

### Procedural accessors — `module_getX(ctx, ...)` not `ctx.getX()`

No methods on objects. For complex derived data, define getter/setter **free functions**:
```ts
// ✅ Procedural getter/setter
chat_getApiKey(provider)                    // resolve key from ENV / keys.json / auto-detect
chat_saveApiKey(provider, key)              // persist key
chat_loadMessages(id, sessions, msgs, cache) // build full message chain
chat_getSession(db, id)                     // read from DB
chat_setSessionTitle(db, id, title)         // write to DB

// ❌ OOP
ctx.getApiKey(provider)     // method = hidden dispatch
session.loadMessages()      // method on mutable object
db.getSession(id)           // this one is OK — db is a module-level factory, not a class instance
```

Name pattern: `<module>_get<Thing>`, `<module>_set<Thing>`, `<module>_load<Thing>`, `<module>_save<Thing>`.

API keys resolve fresh each call — never cache credentials in Session. After re-login, all sessions immediately pick up the new key.

### Function Signatures

**Every function that touches shared state gets `(ctx, session, ...)` as first params.** If a function might need DB, config, cwd, or session data — pass ctx/session explicitly, don't reach into globals.

| Scope | Signature |
|-------|-----------|
| Tool execute | `(ctx, session, params, signal?)` |
| Route handler | `(ctx, req, params?)` |
| DB/business logic | `(ctx, ...)` or `(db, ...)` |
| Pure logic (no state) | bare params OK — but pass data in, not accessors |

**Pure functions** that do computation on data (not fetching it) can take bare params. But the **caller** must extract data from ctx/session — the function itself never reaches up.

```ts
// ✅ Pure function — all data passed in
chat_loadMessages(sessionId, sessions, messages, cache)

// ✅ Caller builds args from ctx
const msgs = chat_loadMessages(id, (id) => ctx.db.getSession(id), (id) => ctx.db.getMessages(id), cache)

// ❌ Function reaches into ctx internally
function loadMessages(sessionId) { const db = getDb(); ... }

// ❌ Closure over module state
const db = chat_db(); function loadMessages(id) { db.getSession(id) }
```

### Environment: only Ctx reads env

`process.env`, `process.cwd()`, `os.homedir()` — read **once** at startup in `chat_getCtx()`, stored in `ctx.cwd`, `ctx.home`, `ctx.env`. All other code receives these from ctx/params.

```ts
// ✅ Startup (chat_ctx.ts) — the ONE place that reads env
const cwd = process.cwd();
const home = process.env.HOME;
const env = { ...process.env };
ctx = agent_createCtx({ cwd, home, env, ... });

// ✅ Functions receive from ctx
chat_getApiKey(ctx.home, provider)
chat_resolveApiKey(ctx.home, settings)

// ❌ Reading env inside functions
const home = process.env.HOME;  // FORBIDDEN
```

### FORBIDDEN
- Singletons (`getDb()`, module-level `let`)
- `process.cwd()` / `process.env` / `os.homedir()` inside functions
- Closures over mutable global state
- Functions that fetch their own dependencies — caller provides everything

## File Naming

```
<module>_<function>.ts          # function
<module>_type_<Type>.ts         # type definition
<module>_view_<name>.tsx        # SSR view component
page_<path>.tsx                 # GET page (ctx, req, params) → layout + HTML
frag_<path>.tsx                 # GET fragment (ctx, req) → HTML for htmx swap
form_<path>_POST.tsx            # POST handler (ctx, req) → redirect
tool_<name>.ts                  # agent tool
UI_<Component>.tsx              # reusable UI component
<module>.ts                     # barrel re-export
```

Navigate with `ls`:
```sh
ls tool_*.ts    # all agent tools
ls page_*.tsx   # all pages
ls *_type_*.ts  # all types
ls *.test.ts    # all tests
```

## Storage

**SQLite** (`.hyper/hyper.db`, WAL mode) via `bun:sqlite`:
- `sessions` — session_id, title, parent, model, offset, timestamps
- `messages` — session, role, content (JSON for assistant/toolResult), timestamp
- `messages_fts` — FTS5 full-text index with BM25 ranking
- `unread` — last_seen count per session
- Access via `ctx.db` (from `chat_db.ts`)

**API Keys** (`~/.hyper/keys.json`) — global, shared across projects:
- Priority: ENV → `~/.hyper/keys.json` → auto-detect (kimi CLI `~/.kimi/credentials/`)
- `chat_saveApiKey(provider, key)`, `chat_getApiKey(provider)`

## Providers

| Provider | API | Auth | Stream file |
|----------|-----|------|-------------|
| `openai-codex` | Codex Responses (raw fetch) | OAuth JWT | `ai_streamCodex.ts` |
| `kimi-coding` | Anthropic Messages | API key / CLI | `ai_streamAnthropic.ts` |
| `anthropic` | Anthropic Messages | API key | `ai_streamAnthropic.ts` |
| `openai` | OpenAI Responses | API key | `ai_streamResponses.ts` |
| `lmstudio` | OpenAI Completions | `lm-studio` | `ai_stream.ts` |
| Others (groq, openrouter...) | OpenAI Completions | API key | `ai_stream.ts` |

Prompt caching: Anthropic `cache_control`, Codex `prompt_cache_key`.
Per-session model: each session stores `provider/modelId` in DB.

## Tools

| Tool | Description |
|------|-------------|
| `read` | Read file with line numbers, offset/limit |
| `write` | Create/overwrite file |
| `edit` | Exact text replacement, shows diff |
| `bash` | Shell command with timeout |
| `grep` | Regex search via ripgrep |
| `find` | Glob file search |
| `ls` | Directory listing |
| `html_message` | Static HTML inline in chat (tables, reports) |
| `html_dialog` | Blocking modal for user input (forms, confirmations) |
| `hyper_ui` | CGI-style interactive widgets |
| `subagent` | Fork session, delegate task, wait for report |
| `subagent_report` | Report back to parent (child sessions only) |
| `memory_search` | FTS5+BM25 search across all sessions |
| `ts` | TypeScript AST via ts-morph (symbols, references, rename) |
| `websearch` | Web search |

Tool execute signature: `(ctx: Ctx, session: Session, params, signal?) → Promise<Result>`

## Routes

**Global:**
- `GET /` → redirect to `/session/:latest/`
- `GET /session/new` → create session form (provider, model, title)
- `POST /session/create` → create and redirect
- `POST /session/delete`, `POST /session/rename`
- `GET /sessions` → sidebar fragment (htmx, polls every 5s)
- `GET /models?provider=X` → model options for cascading select

**Per-session** (under `/session/:id/`):
- `GET /session/:id/` → chat page
- `POST /session/:id/chat` → send message (SSE stream)
- `POST /session/:id/steer` → inject steer message
- `POST /session/:id/abort` → abort agent
- `POST /session/:id/dispatch` → dialog/widget response
- `GET /session/:id/stream` → SSE reconnect
- `GET /session/:id/stats` → token count + cost
- `GET /session/:id/rewind?index=N` → rollback history

Route files export `(ctx: Ctx, req: Request, params?) → Response | string | null`.
Router injects ctx automatically.

## Keyboard Shortcuts

- **Enter** — send message (or queue follow-up if streaming)
- **Ctrl+Enter** — steer (inject into current turn)
- **Escape** — abort agent
- **Hover user message** → rewind icon (rollback to that point)

## Sub-agents

Agent calls `subagent({ task: "..." })` → forks session (parent link, no data copy) → child runs autonomously → calls `subagent_report({ result: "..." })` → parent continues.

- Child gets parent messages up to fork point (offset) for LLM context
- UI shows only child's own messages
- Sidebar shows tree with `↳` indent
- Blocking: parent waits for report

## Testing

```sh
# run ALL project tests (root only, not docs/)
bun test --preload ./test_preload.ts $(ls *.test.ts *.test.tsx)

# run specific test file
bun test --preload ./test_preload.ts chat_db.test.ts

# show only failures (filter out passing tests)
bun test --preload ./test_preload.ts $(ls *.test.ts *.test.tsx) 2>&1 | grep -E '(✗|fail|FAIL|error:|Ran )'

# typecheck
bun run typecheck     # tsc --noEmit
```

**IMPORTANT**: always use `--preload ./test_preload.ts` and explicit file list. Never `bun test` bare — it recurses into `docs/` and `node_modules/`.

- `test_preload.ts` sets `HYPER_SESSION_DIR=/tmp/hyper-test-sessions`
- Tests use `:memory:` DB or temp directory — never touch production `.hyper/`
- Views tested as functions: `(data) → string` → assert HTML
- Tools tested by calling `execute(ctx, session, params)` directly
- Known pre-existing failures: `agent.test.ts` (needs LM Studio running), `pi-mono/` (old submodule)

## Server

```sh
# start
tmux kill-session -t hyper-code 2>/dev/null
tmux new-session -d -s hyper-code 'bun server.ts'

# logs
tmux capture-pane -t hyper-code -p -S -30

# port
cat .port

# restart (do after adding new route files)
tmux kill-session -t hyper-code; tmux new-session -d -s hyper-code 'bun server.ts'
```

Reuses port from `.port` file. Writes new port if not available.

## JSX Runtime

Custom `jsx.ts` → HTML strings. No React.
- `className` (not `class`), `dangerouslySetInnerHTML={{ __html: html }}`
- Boolean attributes: `<option selected={true}>` → `selected`
- Returns `string` — can concatenate, test directly

## Data Attributes

Views use `data-*` attributes for testing and CDP — no CSS class selectors.

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `data-page` | Page identity | `chat`, `new-session` |
| `data-entity` | Entity type | `message`, `tool`, `session`, `widget` |
| `data-id` | Entity ID | session filename |
| `data-status` | State | `user`, `assistant`, `done`, `error`, `running` |
| `data-role` | Semantic field | `content`, `tool-name`, `tool-args` |
| `data-action` | Clickable action | `new`, `settings` |
| `data-form` | Named form | `prompt` |

`pageState(html)` parses HTML into structured state for tests.

## CDP (Browser Testing)

```sh
tmux new-session -d -s hyper-code-cdp 'CDP_PORT=2230 CDP_CHROME_PORT=9223 bun cdp_server.ts'
```

```sh
bun -e "import {cdp} from './cdp.ts'; await cdp.navigate('/'); console.log(await cdp.pageState())"
bun -e "import {cdp} from './cdp.ts'; await cdp.fill('textarea', 'Hi'); await cdp.click('button')"
```

API: `navigate`, `pageState`, `click`, `fill`, `submit`, `text`, `evaluate`.
Prefer `pageState` over screenshots.

## Stack Docs

| Index | Full docs | What |
|-------|-----------|------|
| `docs/bun.md` | `docs/bun_reference/` | Bun runtime — prefer built-ins over npm |
| `docs/htmx.md` | `docs/htmx_reference/` | htmx attributes, swap, triggers |
| `docs/tailwind.md` | `docs/tailwind_reference/` | Tailwind CSS utilities |
| `docs/datastar.md` | `docs/datastar_reference/` | Datastar — reactive SSE UI |

### htmx vs Datastar

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

**ai** — LLM streaming via OpenAI-compatible APIs
- `ai_stream(model, context, opts)` → `AssistantMessageEventStream` (async iterable)
- Auto-routes: Codex → `ai_streamCodex`, OpenAI/GitHub → `ai_streamResponses`, others → Completions API
- `ai_renderMarkdown(text)` → HTML with shiki syntax highlighting (github-light theme)
- `ai_models_generated.ts` — 856 models across 23 providers

**agent** — Agent loop: prompt → LLM → tool execution → repeat
- `agent_run(ctx, session, prompt, onEvent)` — main loop, emits `AgentEvent`s
- `agent_executeTools(ctx, session, toolCalls, onEvent, signal?)` — sequential tool execution
- `agent_abort(session)` — abort running agent
- `agent_reset(session)` — clear session state

**tools** — Coding tools
- Each tool: `tool_<name>(cwd): AgentTool` → `{ name, description, parameters, execute }`
- Execute signature: `(ctx, session, params, signal?) → Promise<Result>`
- Content types: `{ type: "text", text }`, `{ type: "image", data, mimeType }`, `{ type: "html", html }`

**chat** — Web UI with SSE streaming
- `chat_createSSEStream(runAgent)` — agent events → SSE HTML fragments
- `chat_settings.ts` — persistent provider/model/API key config
- `chat_db.ts` — SQLite storage: sessions, messages, api_keys, unread

**hyper_ui** — Interactive HTML widgets (CGI style)
- `hyper_ui_run(cwd, name, req)` — CGI runner
- `hyper_ui_list(cwd)` — list available widgets
- `hyper_ui_route.ts` — HTTP handler for `/ui/*`

## Navigating with `ls`

```sh
ls *.ts *.tsx                  # everything
ls ai_*.ts                     # LLM streaming layer
ls agent_*.ts                  # agent loop
ls tool_*.ts                   # coding tools
ls chat_*.ts chat_*.tsx        # chat web UI
ls *_view_*.tsx                # all views
ls *_type_*.ts                 # all types
ls page_*.tsx                  # all pages (layout wrapped)
ls frag_*.tsx                  # all htmx fragments
ls form_*.tsx                  # all form handlers
ls api_*.tsx                   # all REST JSON endpoints
ls *.test.ts                   # all tests
ls UI_*.tsx                    # all UI components
ls cdp*.ts                     # CDP browser testing
```

## UI Components (`UI_*.tsx`)

Reusable SSR components. PascalCase so they work as JSX tags:

```tsx
<UI_Button action="send" type="submit" variant="primary">Send</UI_Button>
<UI_Input name="prompt" placeholder="Ask something..." />
<UI_Textarea name="body" label="Message" rows={4} />
<UI_Alert message="Error text" variant="error" />
```

**Button variants:** `primary` (dark), `success` (green), `danger` (red), `outline` (bordered), `ghost` (text only)

## Views (SSR)

Components are pure functions: `(props) → string`. **Split logic and rendering** — handler wires logic + view:

```tsx
// page_chat.tsx
export default async function(ctx: Ctx, req: Request) {
  const messages = ctx.db.getMessages(id);
  return layout_view_page("Chat", chat_view_page(messages));
}
```

## Route Types

Four kinds of route files. `$param` in filename becomes `:param` in route.

| Kind | File pattern | Maps to | Returns |
|------|-------------|---------|---------|
| Page | `page_*.tsx` | `GET /...` | Full HTML with layout |
| Fragment | `frag_*.tsx` | `GET /...` | HTML fragment (htmx swap) |
| Form | `form_*_POST.tsx` | `POST /...` | Redirect |
| REST API | `api_*_GET.tsx` | `GET /api/...` | JSON |

```
page_index.tsx           → GET /
page_chat_$id.tsx        → GET /chat/:id
frag_chat_messages.tsx   → GET /chat/messages
form_chat_POST.tsx       → POST /chat
api_status_GET.tsx       → GET /api/status
```

## Error Handling

- **Validation errors** — re-render with error message
- **Not found** — return `null` (router sends 404)
- **Redirect** — `new Response(null, { status: 302, headers: { Location: "/path" } })`

## Testing HTTP Handlers

Handlers are functions `(ctx, req, params) → string | Response | null`. Call directly in tests:

```ts
import page_index from "./page_index.tsx";
test("GET / renders", async () => {
  const result = await page_index(testCtx, new Request("http://localhost/"));
  expect(typeof result).toBe("string");
});
```

## Calling Functions with `bun -e`

Every function is pure — call directly from CLI:

```sh
# stream from LLM
bun -e "import { ai_stream } from './ai.ts';
const s = ai_stream(model, { messages: [{role:'user',content:'Hi',timestamp:Date.now()}] }, { apiKey: process.env.OPENAI_API_KEY });
for await (const e of s) { if (e.type === 'text_delta') process.stdout.write(e.delta); }"
```

Prefer `bun -e` for quick validation during development.

## hyper_ui — CGI Widgets

Scripts (`hyper_ui_<name>.ts`, `.py`, `.sh`) read env vars (`REQUEST_METHOD`, `PATH_INFO`, `QUERY_STRING`, `WORKSPACE_DIR`), write HTML to stdout.

Served at `/ui/{name}/*`. Built-in: `editor` (CodeMirror at `/w/editor/`).

## Adding a Tool

1. Write test: `tool_<name>.test.ts`
2. Create `tool_<name>.ts` with `execute(ctx, session, params, signal?)`
3. Register in `chat_ctx.ts` tools array
4. Add to system prompt in `agent_buildSystemPrompt.ts`
5. Run tests, typecheck, restart server

## Adding a hyper_ui Widget

1. Create `hyper_ui_<name>.ts` (or `.py`, `.sh`) in workspace
2. Script reads `REQUEST_METHOD`, `PATH_INFO`, `QUERY_STRING` from env vars
3. POST body comes via stdin
4. Write HTML to stdout — htmx attributes work for interactivity
5. Use `hx-target="#hyper-ui-<name>"` for self-updating
6. Use `hx-post="/session/:id/dispatch"` to send message back to agent
7. Agent shows widget via `tool_hyper_ui` with `action=show`
