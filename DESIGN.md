# Hyper Code — Design

## The name

**Hyper Code** means *hypermedia*-driven coding agent. Not "fast code." The whole system assumes HTML + HTTP + SSE is how agent and human talk to each other. Everything else follows.

## Inspiration

Emacs. Tiny C core runs a Lisp interpreter; everything else (editing, email, shell) is Lisp on top. Core and user code look the same and live in the same namespace. We want that — with one twist. Emacs lives in text buffers; we live in a browser.

## Four pillars

| | Role | Emacs |
|---|---|---|
| **Tools** | the vocabulary — what you can say | `defun` |
| **evalCode** | the grammar — how you combine things | `eval` |
| **REPL** | the voice — who speaks, when | `*scratch*` |
| **Hypermedia** | the medium — HTML in the browser | — |

A "tool" here is just a stateless TypeScript function in the registry. It can be a tool in the LLM sense (`read`, `bash`), a view (`page_chat`), a route, a hook, a provider, the agent loop itself. One namespace, one protocol, one way to look things up.

`evalCode(code)` runs a TypeScript string with every tool in scope. This is the **only** tool the LLM sees. One schema in the prompt instead of fifteen. The agent writes loops, chains calls, uses conditionals — no more one-tool-per-turn round-trips.

```ts
evalCode({ code: `
  const files = await find("*.test.ts");
  for (const f of files) {
    if ((await read(f)).includes("describe.skip")) console.log(f);
  }
` });
```

The REPL is the same evaluator, exposed to the human as a panel in the UI. Same scope, same registry, same output stream. Which means the REPL replaces: settings UI (`setModel(...)`), config files (`define(name, fn)`), hook wiring (`on("before-edit", fn)`), debugging (`session.messages`), and tool prototyping (write → test → `persist(name)` when it's good).

Hypermedia is a pillar, not a detail. The agent's output is HTML streamed over SSE into the browser. State transitions are in the markup — `<form hx-post="/session/:id/dispatch">` — not in some protocol the agent has to remember. No JSON API, no client-side state. Agent, tools, REPL, routes all produce the same thing: HTML fragments into one stream. Agent doesn't describe a choice — it renders buttons. Doesn't describe progress — it renders a live bar.

Each pillar covers for the others. Without tools, evalCode has nothing to call. Without evalCode, tools become 15 separate LLM tools with no composition. Without the REPL, only the agent can shape the system. Without hypermedia, output is plain text and you're back to JSON APIs and client state machines.

## The foundation under all four

One rule, already enforced by the linter:

> Every function takes what it needs as parameters. No singletons, no module-level mutable state, no closures over shared state. Ctx and session flow explicitly.

This is what makes the rest work:

- Tools hot-reload because there's no state to migrate.
- evalCode is safe to call repeatedly because state lives in arguments.
- REPL is boring — just function calls with current ctx/session.
- Hypermedia fits because state lives in session/db; every render is a fresh projection.

## The kernel

Smallest thing that lets the four pillars exist:

1. **`bun.serve`** — HTTP + SSE.
2. **`ctx.tools`** — `Map<name, fn>` filled at startup from three directories (below). File watcher updates it on change. Looked up by name at call time, never by reference.
3. **`evalCode`** — one evaluator, shared by agent and human.
4. **Session / Ctx** — create, load, persist. SQLite.
5. **Event bus** — one stream per session: LLM deltas, tool calls, logs, hook fires. SSE subscribes.
6. **Router** — URL → tool. The routing table is just registry data.

A few hundred lines. Everything else — every tool, view, provider, the agent loop — is a file in one of the three tool directories.

## Where tools live

| Path | Scope |
|---|---|
| Hyper source `tools/*.ts` | core — ships with Hyper |
| `$HOME/.hyper/tools/*.ts` | your tools — across all your projects |
| `$PROJECT/.hyper/tools/*.ts` | project tools — checked into the repo |

Override order: **core < user < project**. A project can replace any core tool by dropping a file with the same name in `.hyper/tools/`. No fork, no PR.

One tool per file. Filename (minus extension) is the name. `tools/read.ts` → `read`. Default export is the function. Named exports are metadata:

```ts
export default async function read(path: string) { ... }
export const doc = "Read a file. Returns text with line numbers.";
export const examples = [`await read("package.json")`];
export const route = null; // or "/api/read" if it's also an HTTP endpoint
```

`describe` and `apropos` read the metadata. The router reads `route`. The agent and the REPL just call the function.

## Hyper modifies itself

The system splits cleanly in two:

- **Frozen** (restart to change): the kernel — `bun.serve`, evalCode, registry storage, watcher, SSE, SQLite setup.
- **Live** (changes instantly): everything else — routes, pages, tools, agent loop, providers, system prompt, hooks, model config, even `describe`.

What this buys you:

- Agent spots a pattern, writes a `deploy()` tool, calls `persist("deploy")`. Next session in this project has `deploy` as a real verb. Agent teaches itself the project.
- Try a new agent loop: `define("agent_run", experimental)` in the REPL. Breaks? `reload()` restores the file version. Other sessions untouched.
- Edit a view file, save, refresh. Session history intact.

There's a bootstrap floor (you need the evaluator and registry before `define` works). Everything above that loads from files, re-loadable at any time. Same shape as Emacs and Smalltalk: small frozen floor, huge live system, no structural difference between core and extension.

## Sessions are live HTML documents

A session isn't a chat log. It's an HTML document being streamed over SSE, co-written by three authors:

- **Agent** — via its responses and evalCode output.
- **Human** — via the chat input, the REPL, clicking on rendered affordances.
- **Tools** — return HTML fragments that either writer can embed.

All three drop fragments into one event stream. Rewind, fork, steer still exist, but now they're operations on a hypermedia artifact, not on a text buffer.

## Introspection

`apropos(query)`, `describe(name)`, `source(name)` — all tools themselves. The system prompt doesn't list every tool. It says:

> You have `evalCode`. Output is HTML streamed to a browser. Use `apropos(topic)` and `describe(name)` to find what you can call.

Agent pulls in what it needs. The prompt stays constant size as the library grows.

## Hooks, init, modes

**Hooks**: named events with multiple listeners, looked up at fire time. `before-eval`, `after-tool`, `before-save`, `session-start`. Hooks are tools. `on(event, fn)` is a tool.

**`.hyper/init.ts`**: runs when a project session starts. Just TypeScript. Registers tools, hooks, modes, sets defaults. This is `.emacs`.

**Modes**: bundles of tool + hook registrations. `strict-tdd-mode` = before-save hook that rejects edits without a failing test. `readonly-mode` = disables write/edit/bash. Activating a mode = calling a tool.

## Rules that keep it working

1. No hidden state. Every function takes what it needs.
2. No singletons, no module-level mutable state.
3. Registry lookup by name, at call time. Never cache a function reference.
4. User and core tools follow the same protocol.
5. The kernel doesn't know about specific tools. If it learns `read` or `bash`, that's a bug.
6. `apropos`, `describe`, `source` are tools, not special features.
7. Hooks resolve at fire time.
8. Tools return HTML when the output is user-facing, data when it's for another tool.

## Non-goals

- **Sandboxing evalCode.** Agent runs in your dev env and already has shell. A sandbox here is theater. Trust the project's `.hyper/` like you trust its hooks and scripts.
- **A DSL.** It's TypeScript. Want a macro? Write a function.
- **Other languages for tools.** Call them via `bash(...)`. The library stays one language.
- **A JSON API next to hypermedia.** External interface is hypermedia.

## Open questions

- **Blocking flows inside evalCode.** `dialog()`, `widget()`, `subagent()` need to suspend the agent turn, render UI, resume with the result. Worker with suspend/resume? Temp file + re-entry? Async generators?
- **Streaming granularity.** Each tool call inside one evalCode should appear in the UI as it happens, not at the end. Needs an event protocol.
- **Approval granularity.** "Allow edit, deny bash" is harder with one `evalCode`. Probably: approvals on tool names via `before-call` hook.
- **REPL scope.** Session-local or global by default? `define` per session, `persist` global?
- **Who did what.** When a human runs `edit(...)` from the REPL, how does it show in the session log? Probably a new event `repl_call`, visually distinct but equal in the bus.
- **Weak models.** Code-as-action wants Claude/GPT-4 class. Small local models may need a classic-tools fallback, or just not be supported.
