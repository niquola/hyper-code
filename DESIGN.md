# Hyper Code — Design

## Vision

Hyper Code is a coding agent harness inspired by **Emacs**.

Emacs is ~30 MB of C that runs a Lisp interpreter. Everything a user interacts with — file editing, email, shell, version control, project management — is Lisp on top of that kernel. The C core doesn't know about "modes" or "packages"; it knows about evaluation, buffers, and keymaps. Users extend the system by writing Lisp, and their Lisp is indistinguishable from the built-in Lisp.

We want the same shape for an agent harness:

- A **tiny kernel** that knows only about evaluation, sessions, streaming, and persistence.
- A **library of functions** (the "Lisp world") that does everything else: file I/O, shell, search, LLM calls, UI widgets, sub-agents.
- **No structural divide** between core library functions and project/user extensions. Both are just TypeScript modules, registered the same way, callable the same way, introspectable the same way.
- **Live, on-the-fly extensibility** — drop a file in `.hyper/lib/`, it's immediately available to the agent without restart.

## The Minimal Kernel

The kernel is small and boring. It knows about:

1. **Ctx and Session** — state containers. All state lives here; no singletons, no globals.
2. **The agent loop** — prompt → LLM → tool call → tool execution → feed result back → repeat.
3. **LLM streaming** — a provider-agnostic async iterable of events.
4. **Persistence** — SQLite for sessions, messages, FTS.
5. **The eval tool** — the single way the LLM causes things to happen.
6. **A function registry** — name → TypeScript function, with a file watcher that reloads on change.
7. **A hook system** — named extension points the kernel raises events on.

That is the entire kernel. Everything else — every current tool, every view helper, every sub-agent, every widget — is a library function.

## One Tool: `eval`

Instead of a tool per capability (`read`, `write`, `edit`, `bash`, `grep`, `subagent`, …), the LLM sees **one tool**: execute TypeScript.

```ts
eval({ code: `
  const files = await find("*.test.ts");
  for (const f of files) {
    const content = await read(f);
    if (content.includes("describe.skip")) {
      console.log(f);
    }
  }
` });
```

Inside `code`, a set of library functions is in scope (or importable from a well-known namespace like `import { read, edit, bash } from "hyper"`). Those are the same functions that used to be individual tools.

**Why this matters:**

- **Composition.** The LLM can chain `read → transform → write` in one call, with real loops and conditionals, instead of four separate tool-call rounds with the model.
- **Token efficiency.** One tool schema in the system prompt, not fifteen.
- **Extensibility falls out for free.** Adding a new capability is just adding a function to the library. No new tool schema, no new plumbing.
- **Typed.** The library is normal TypeScript. Signatures, return types, generics — all intact.

## No User / Core Divide

In Emacs, `find-file` (built in) and `my-cool-command` (in your `.emacs`) are peers. Same calling convention, same registry, same introspection, same keybinding mechanism.

Here:

- `lib/read.ts` — a core library function.
- `.hyper/lib/my_fn.ts` — a user/project library function.
- Both export a function of the same shape.
- Both are registered in the same name-keyed registry.
- Both are callable from `eval` code the same way: `await read(...)` or `await my_fn(...)`.
- Both show up in `apropos` and `describe`.

The kernel treats them identically. The only difference is *where the file lives*, which decides *when it loads* (startup vs. project-scoped) — not *what it is*.

## Introspection First

A major reason Emacs is infinitely extensible is that it is **self-describing**. `C-h f` tells you what any function does. `apropos` finds functions by keyword. `find-function` jumps to source.

The agent gets the same primitives — as library functions:

- `apropos(query)` — list library functions whose name or docstring matches.
- `describe(name)` — return signature, docstring, examples.
- `source(name)` — return the function's source.

This enables **progressive disclosure**. The system prompt doesn't need to enumerate every available function. It only needs to say:

> You have `eval(code)`. To discover what you can call, use `apropos(topic)` and `describe(name)`.

The agent then pulls in the right tools on demand. As the library grows — especially with project extensions — the system prompt stays constant size.

## Live Reload

This is where Hyper Code's existing discipline pays off enormously.

Our functions are already stateless by rule (see CLAUDE.md):

- No singletons.
- No module-level `let` / `var`.
- No closures over mutable state.
- All dependencies flow in through `ctx` / `session` parameters.

Stateless code is **trivially hot-reloadable**. There is no state to migrate, no long-lived object to re-wire, no cache to invalidate. Replace the function binding in the registry; the next call uses the new version.

The mechanism:

1. A file watcher observes `lib/` and `.hyper/lib/`.
2. On change, the kernel re-imports the module (with a cache-busting query string) and updates the registry entry under that function's name.
3. `eval` code looks functions up **by name at call time**, not by reference.
4. Ctx and session are already rebuilt from sources of truth on each call, so the new function sees current state without migration.

**Consequences of live reload:**

- The user edits a function while the agent is mid-task; the next call sees the new version.
- The agent itself can write a function to `.hyper/lib/foo.ts`, save it, and call `foo(...)` in its *next* tool call — a self-extending loop, with no magic, just a consequence of statelessness + registry + watcher.
- Debugging: add a `console.log`, save, rerun the same prompt. No restart.

**The one discipline this requires:** never cache a function *reference*. Always resolve by name at call time. A held reference freezes you at the old version. This belongs in the linter (`no-function-reference-cache` or similar).

## Hooks

Extension points named by string, with multiple listeners, invoked by the kernel or by other library functions:

- `before-tool` / `after-tool`
- `before-message` / `after-message`
- `session-start` / `session-fork`
- `before-eval` / `after-eval`
- `before-save` (for file writes) — lets a project enforce constraints (e.g. "no edits without a failing test")

Library code registers hooks by name; the kernel runs them in order. Hooks are themselves just library functions.

## Init File

Every project can have `.hyper/init.ts`. It runs when a session for that project starts. It is not special — it's just TypeScript. It can:

- Register library functions.
- Register hooks.
- Activate modes (see below).
- Configure model, system prompt, defaults.

This is `.emacs`. It's how a project shapes the agent to itself.

## Modes

Two kinds:

- **Major mode** — "what kind of project is this": `fhir-mode`, `react-mode`, `rust-mode`. Activates a set of library functions and defaults relevant to the domain.
- **Minor modes** — cross-cutting, composable: `strict-tdd-mode` installs a `before-save` hook that rejects edits without a failing test; `review-mode` routes all writes through a confirmation dialog; `readonly-mode` disables write/edit/bash.

Modes are just bundles of function registrations + hook registrations. Activating a mode = calling its enable function. They are library functions too.

## Sessions Are Buffers

A session in Hyper Code is already close to an Emacs buffer:

- It has persistent content (message history).
- It supports undo (rewind to a prior message).
- It supports branching (fork from a message into a sub-session).
- It can be interacted with by a user (UI) or by a program (agent).

This framing suggests natural operations we should continue to lean into: rewind is undo; fork is branch; steer is inject; subagent is recursive-edit. Thinking of a session as a buffer keeps the model coherent.

## `M-x` for the User

Everything the agent can call, the user should be able to call too.

A command palette in the UI exposes the full library — the same `apropos` / `describe` machinery — so the user can invoke any function directly, pass arguments, and see the result. The agent isn't a gatekeeper between the user and the library; it's just another caller.

This also makes the library **testable by hand**, because every function is a real function you can invoke from the UI, from `bun -e`, or from a test.

## Design Rules (Load-Bearing)

These rules are what make the rest of the design actually work. They are not style preferences — they are structural.

1. **No hidden state.** Every function takes what it needs as parameters. Ctx and session flow in explicitly.
2. **No singletons, no module-level mutable state.** Breaks hot reload and makes tests lie.
3. **Registry lookup by name, at call time.** Never cache a function reference. This is what makes live reload safe.
4. **User and core functions follow the same protocol.** Same registration, same signature shape, same introspection, same invocation.
5. **The kernel does not know about specific tools.** If the kernel grows knowledge of `read` or `edit` or `bash`, that knowledge is a bug — push it into the library.
6. **Introspection is a library function, not a special feature.** `apropos`, `describe`, `source` are just functions in the library.
7. **Hooks are named, multi-listener, and resolve at fire time.** Same principle as function resolution.

## What Becomes Possible

Once the kernel is this small and the library this dynamic:

- **Per-project agents.** A repo's `.hyper/init.ts` + `.hyper/lib/*.ts` completely define what the agent can do in that project. Check it into git; your team's agent is the same as yours.
- **Domain-specific agents.** A FHIR project ships a library of `fhir.*` functions; the agent in that project thinks in FHIR primitives.
- **Self-extending sessions.** Mid-task, the agent recognizes a pattern, writes a helper to `.hyper/lib/`, and uses it immediately.
- **User-authored tools without forking the core.** Drop a file, and the agent (and the UI, and tests) all see it.
- **A library you can read.** Because every capability is just a TypeScript function with a name and a docstring, the whole system is legible in a way per-tool JSON schemas never are.

## What This Replaces

The current `tool_*.ts` files become `lib/*.ts` — plain functions, no tool wrapper. The existing function registry from Phase 0 (`tool/` namespace loader) is the foundation this builds on.

The existing shape of Hyper Code — procedural, ctx-threaded, stateless, SQLite-backed, SSR-rendered — does not change. What changes is that the "tool" abstraction collapses into "library function", and the kernel stops caring about what tools exist.

## Non-Goals

- **Sandboxing `eval`.** The agent runs in the user's own dev environment and already has shell access. Adding a sandbox would be security theater here. This design assumes trust in the project's `.hyper/` directory, just as `git` and `npm` assume trust in a repo's hooks and scripts.
- **A DSL.** The library is TypeScript. No custom syntax, no macro system, no config language. If you want a macro, write a function.
- **Cross-language plugins.** The library is TypeScript. Shell scripts and other-language tools are reachable through `bash(...)`, but the library itself is one language for coherence.

## Open Questions

- **Interactive flows inside `eval`.** `dialog()`, `hyper_ui()`, `subagent()` need to suspend the agent turn, show UI, and resume with a result. Mechanism: Bun worker with suspend/resume? Temp file + re-entry? To be decided.
- **Streaming progress inside `eval`.** Currently each tool call is a distinct UI block. In one `eval` call, we want `console.log` (and library-function-entry events) to stream into the UI as they happen. The protocol for that needs to be designed.
- **Approval granularity.** "Allow `edit`, deny `bash`" is harder when everything is `eval`. Probably: approvals register on library-function names, enforced by a hook on `before-call`.
- **Smaller models.** Code-as-action works well with strong models (Claude, GPT-4 class). Weaker local models may struggle. We may need a fallback "classic tools" mode, or just accept that this harness assumes a strong model.
