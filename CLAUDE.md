---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

## Project — Hyper Code

Web-based coding agent with htmx SSR UI. Multi-session, multi-model, multi-provider. SQLite storage, sub-agents, interactive widgets, full-text search.

## Core Principles

1. **Procedural** — functions and types, no classes. One function/type per file.
2. **Ctx holds all state** — db, cwd, model, tools. No singletons, no `process.env` reads inside functions.
3. **URL determines screen** — session ID in URL, all actions scoped to URL session. Refresh = same state.
4. **Strict TDD** — write test FIRST. Bug found? Failing test FIRST, then fix.
5. **Light theme** — github-light shiki, no dark backgrounds.

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

### FORBIDDEN
- Singletons (`getDb()`, module-level `let`)
- `process.cwd()` / `process.env` inside functions (read once into Ctx at startup)
- Closures over mutable global state
- Tool execute: always `(ctx, session, params, signal?)`

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
bun test *.test.ts    # all tests
bun run typecheck     # tsc --noEmit
```

- `test_preload.ts` sets `HYPER_SESSION_DIR=/tmp/hyper-test-sessions`
- Tests use `:memory:` DB or temp directory — never touch production `.hyper/`
- `chat_db.test.ts` — 19 DB tests (sessions, messages, search, fork, unread)
- Views tested as functions: `(data) → string` → assert HTML
- Tools tested by calling `execute(ctx, session, params)` directly

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

**htmx** for simple request/response. **Datastar** for reactive client state, real-time SSE, two-way binding.

## hyper_ui — CGI Widgets

Scripts (`hyper_ui_<name>.ts`, `.py`, `.sh`) read env vars (`REQUEST_METHOD`, `PATH_INFO`, `QUERY_STRING`, `WORKSPACE_DIR`), write HTML to stdout.

Served at `/ui/{name}/*`. Built-in: `editor` (CodeMirror at `/w/editor/`).

## Adding a Tool

1. Write test: `tool_<name>.test.ts`
2. Create `tool_<name>.ts` with `execute(ctx, session, params, signal?)`
3. Register in `chat_ctx.ts` tools array
4. Add to system prompt in `agent_buildSystemPrompt.ts`
5. Run tests, typecheck, restart server
