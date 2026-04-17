# Hyper Code — Design

## The Name

**Hyper Code** = *hypermedia*-driven coding agent.

Not "fast code." Not "super code." The name is the manifesto. This system treats hypermedia — HTML, HTTP, SSE, links, forms, fragments — as the primary medium through which agent and human collaborate on code. That choice cascades into every other design decision.

## Vision

Hyper Code is a coding agent harness inspired by **Emacs**.

Emacs is ~30 MB of C that runs a Lisp interpreter. Everything a user interacts with — file editing, email, shell, version control — is Lisp on top of that kernel. The C core knows about evaluation, buffers, and keymaps; it does not know about "modes" or "packages." Users extend the system by writing Lisp, and their Lisp is indistinguishable from the built-in Lisp.

We want the same shape for an agent harness — but with one difference: Emacs' medium is *text in buffers*. Ours is *hypermedia in a browser*. That difference is load-bearing, and it is the fourth pillar of the design.

## The Four Pillars

Hyper Code stands on four pillars. Each one is necessary; each one fails without the others. Together they form a self-modifying, live, hypermedia-native programming environment for agents and humans.

| Pillar | Role | Emacs analogue |
|---|---|---|
| **Procedures** | vocabulary — what can be said | `defun` |
| **evalCode** | grammar — how things combine | `eval` |
| **REPL** | voice — who speaks, when | `*scratch*` / `M-x eval-expression` |
| **Hypermedia** | medium — in what form we communicate | — (Emacs has no rich equivalent) |

### Procedures — the Vocabulary

A procedure is a plain TypeScript function, registered in a name-keyed registry. Stateless (all dependencies passed in), introspectable (docstring, signature), hot-reloadable (watcher + registry swap).

Everything that used to be a "tool" becomes a procedure: `read`, `write`, `edit`, `bash`, `grep`, `find`. Everything that used to be a "view" becomes a procedure: `page_chat`, `frag_messages`. Everything that used to be a "route" becomes a procedure. LLM providers become procedures. The agent loop itself becomes a procedure.

One namespace, one registration protocol, one introspection surface.

### evalCode — the Grammar

`evalCode(code)` executes a TypeScript string with the procedure registry in scope. This is the single tool the LLM sees.

```ts
evalCode({ code: `
  const files = await find("*.test.ts");
  for (const f of files) {
    const content = await read(f);
    if (content.includes("describe.skip")) console.log(f);
  }
` });
```

One tool schema in the system prompt, not fifteen. Real loops and conditionals. Composition in one call instead of four model round-trips. The library is normal TypeScript: signatures, return types, generics — all intact.

### REPL — the Voice

The same evaluator is exposed to the human as a REPL panel in the Web UI. Agent's `evalCode` and user's REPL are **literally the same code path** — same scope, same registry, same introspection.

This changes what the REPL *replaces*:

- **Settings UI.** Change the model? `setModel("claude-opus-4-7")` in the REPL.
- **Configuration files.** Register a project procedure? `define(name, fn)`. Persist? `persist(name)`.
- **Hook wiring.** `on("before-edit", check_tests)`.
- **Debugging.** `session.messages`, `ctx.db.getSession(id)` — inspect live state.
- **Prototyping tools.** Write in REPL, test, `persist(name)` when you like it.

Without the REPL, the system is agent-only from the human's side. The human can edit files, but not *converse* with the running system. The REPL makes the system human-shapeable at runtime.

### Hypermedia — the Medium

The agent's output is not plain text to be rendered somewhere. It is **HTML streamed over SSE into the user's browser**, and the agent knows it.

This is not "the agent can emit HTML if it wants to." It is a **structural** choice that changes what every response is:

1. **HATEOAS.** State transitions are encoded in the hypermedia itself. The agent writes `<form hx-post="/session/:id/dispatch">…</form>` — the next state transition is in the markup, not in a protocol the agent must remember. Less protocol in the agent's head, more in the medium.
2. **No impedance mismatch.** There is no JSON API plus a client-side state machine plus server-side rendering. There is one artifact: HTML fragments. Procedures, routes, agent responses, REPL output — all produce the same thing. The browser is the only consumer. htmx handles fragment swapping; Datastar handles live SSE-driven updates.
3. **Affordances as a language.** The agent doesn't describe "you have a choice" — it renders buttons. It doesn't ask "please provide a value" — it renders a form. It doesn't narrate progress — it renders a live indicator updating over SSE. The vocabulary of the agent is enriched by the full vocabulary of the web platform.
4. **Co-authored documents.** A session is not a chat log. It is a **live hypermedia document**, co-written by agent, human (via REPL and UI), and procedures, streamed incrementally. All three writers drop fragments into the same event stream.

### Why Four (Mutual Reinforcement)

Each pillar closes the weakness of the others:

|  | Without procedures | Without evalCode | Without REPL | Without hypermedia |
|---|---|---|---|---|
| Result | evalCode is raw Bun — nothing useful to call | procs degenerate into 15 separate tools — token overhead, no composition | system is agent-only, statically shaped by files | agent output is plain text — no interactivity, no affordances, impedance mismatch returns |

- Procedures give evalCode a meaningful vocabulary and give the REPL something to invoke.
- evalCode turns procedures from isolated tools into a composable language and gives the REPL a way to execute.
- REPL makes procedures and evalCode available to humans, not just agents.
- Hypermedia makes procedure output and evalCode output and REPL output *matter* to the user as more than text.

Remove any one pillar and the system collapses into a more conventional (and more limited) shape: a chatbot with JSON tools, or a scripting environment with no UI, or a static web app, or a REPL without an agent.

## The Shared Foundation

All four pillars rest on **one structural principle**, codified in CLAUDE.md and enforced by the linter:

> **Every function takes everything it needs as parameters. No singletons, no module-level mutable state, no closures over shared state. Ctx and session flow explicitly.**

This single rule is what makes the four pillars work together:

- **Procedures** can be hot-reloaded because there is no internal state to migrate.
- **evalCode** is safe to call repeatedly with different contexts because state lives in the arguments, not in the evaluator.
- **REPL** is low-magic — every invocation is just a function call with current ctx/session.
- **Hypermedia** fits naturally because state lives in session/db, not in client-side memory; every render is a fresh projection.

The discipline was introduced for testability and clarity. It turns out to be the enabling condition for everything interesting.

## The Minimal Kernel (the Floor)

Given the four pillars, the kernel is the smallest thing that lets them all exist. Nothing more.

1. **`bun.serve`** — HTTP + SSE. The UI, the REPL, and procedure-invocation endpoints all ride on this.
2. **Procedure registry** — `Map<name, fn>` with a file watcher over `lib/` and `.hyper/lib/`. Resolves by name at call time; never caches references.
3. **`evalCode`** — the one evaluator, shared by agent and human. Executes a TypeScript string with procedures resolvable by import or by registry lookup.
4. **Session / Ctx** — primitives for creating, loading, persisting a session. SQLite-backed.
5. **Event bus** — one stream per session: LLM deltas, procedure calls, logs, hook fires. SSE subscribes.
6. **Router** — URL → procedure dispatch. Even the router's table is registry data.

That is the kernel. A few hundred lines of code. Everything else — every current tool, view, provider, sub-agent, widget, the agent loop itself — is a procedure registered at startup from files.

## Hyper Modifies Itself

A profound consequence of the four-pillar shape with stateless procedures: **Hyper Code can modify itself while running.**

The system is:

- **Frozen kernel** (~few hundred lines, changes only with a restart): `bun.serve`, evalCode evaluator, registry storage, file watcher, SSE, SQLite setup.
- **Live registry** (everything else, changes instantly): the router table, every route/page/fragment, every tool, the agent loop, LLM providers, system prompt, hooks, modes, model config, even `describe` and `apropos`.

Concrete consequences:

- An agent notices it keeps running the same five procedures in sequence. It writes a `deploy()` procedure composing them, calls `persist("deploy")`, and future sessions in this project have `deploy` as a first-class verb. **The agent teaches itself the project.**
- A human experiments with a new agent loop: `define("agent_run", experimental_loop)` in the REPL of one session. If it breaks, `reload()` restores the file version. Neighboring sessions are unaffected.
- A view needs a tweak: edit `lib/page_chat.tsx`, save, refresh the tab. The page is re-rendered by the new version. The session stays alive; history is intact.
- Even `describe` is a procedure. A project can override it to inject domain-specific examples.

**The bootstrap floor.** There is a minimum that must exist before the registry can run: the evaluator (because otherwise there is nothing to evaluate `define` with) and the registry itself (nowhere to put anything). Everything else is loaded by a `bootstrap()` procedure — which is itself a procedure. Very Lisp-shaped turtles.

This is the same property that made Emacs and Smalltalk what they were: **a small frozen floor under a huge live system, with no structural distinction between core and extension**.

## No User / Core Divide

`lib/read.ts` is a core procedure. `.hyper/lib/my_fn.ts` is a project procedure. Both export a function of the same shape. Both register in the same registry under the same protocol. Both are callable from evalCode the same way. Both appear in `apropos` and `describe`.

The kernel treats them identically. The only difference is *where the file lives*, which decides *when it loads* (startup vs. project-scoped) — not *what it is*.

## Introspection First

A major reason Emacs and Smalltalk are infinitely extensible is that they are **self-describing**. `C-h f` describes any function. `apropos` searches by keyword. You can ask the system what it can do, while it runs.

We get the same primitives, as procedures:

- `apropos(query)` — list procedures whose name or docstring matches.
- `describe(name)` — signature, docstring, examples.
- `source(name)` — the procedure's source text.

This enables **progressive disclosure**. The system prompt does not enumerate every procedure. It says:

> You have `evalCode`. Your output is HTML streamed to a browser. To discover what you can call, use `apropos(topic)` and `describe(name)`.

The agent pulls in what it needs on demand. As the library grows — especially with project extensions — the system prompt stays constant size.

## Live Reload

Stateless procedures are trivially hot-reloadable. There is no state to migrate, no cached object to re-wire, no singleton to reset. Replace the binding in the registry; the next call uses the new version.

The mechanism:

1. A file watcher observes `lib/` and `.hyper/lib/`.
2. On change, the kernel re-imports the module (cache-busting query string) and updates the registry entry.
3. evalCode code looks functions up **by name at call time**, not by reference.
4. Ctx and session are rebuilt from sources of truth on each call, so the new function sees current state.

**The one discipline this requires:** never cache a function reference. Always resolve by name. This belongs in the linter.

## Hooks

Named extension points, multi-listener, raised by the kernel or by other procedures, resolved at fire time:

- `before-eval` / `after-eval`
- `before-tool` / `after-tool` (generic wrapping for any procedure invocation)
- `before-save` (file writes) — lets a mode enforce constraints
- `session-start` / `session-fork`
- `before-message` / `after-message`

Hooks are themselves procedures. Registration is a procedure (`on(event, fn)`).

## Init File

Every project can have `.hyper/init.ts`. It runs when a session for that project starts. It is not special — it is TypeScript. It may:

- Register procedures.
- Register hooks.
- Activate modes.
- Configure model, system prompt, defaults.

This is `.emacs`. It is how a project shapes the agent to itself, and how the shape gets checked into git alongside the code.

## Modes

- **Major modes** — "what kind of project is this": `fhir-mode`, `react-mode`, `rust-mode`. Bundles a set of procedures and defaults for the domain.
- **Minor modes** — cross-cutting, composable: `strict-tdd-mode` installs a `before-save` hook rejecting edits without a failing test; `review-mode` routes writes through a dialog; `readonly-mode` disables write/edit/bash.

Modes are just bundles of procedure and hook registrations. Activating a mode is calling a procedure.

## Sessions Are Live Hypermedia Documents

A session is not a chat transcript. It is a **live HTML document streamed over SSE**, co-authored by three writers:

- **The agent** — via evalCode output and its own response text.
- **The human** — via the chat input, the REPL, direct interaction with rendered affordances.
- **Procedures** — returning HTML fragments that either writer may embed or invoke directly (e.g., a route hit returning HTML for the session log).

All three writers drop fragments into the same event stream. The browser renders incrementally. The document supports the operations we already have — rewind (undo), fork (branch), steer (inject) — but understood now as operations on a living hypermedia artifact, not on a text buffer.

## The REPL Is for Humans, Too

Everything the agent can call, the human can call — through the same REPL, the same evalCode, the same registry.

- A command palette in the UI surfaces `apropos` / `describe` for human discovery.
- The human can invoke any procedure with arguments and see the result streamed into the same session (or into the REPL panel).
- The agent is not a gatekeeper between the human and the library. It is just another caller.

This also makes the library **testable by hand**: every procedure is a real function callable from the REPL, from `bun -e`, or from a unit test.

## Design Rules (Load-Bearing)

These are not style preferences. They are structural — violate them and the four pillars stop reinforcing each other.

1. **No hidden state.** Every function takes what it needs as parameters.
2. **No singletons, no module-level mutable state.** Breaks hot reload and makes tests lie.
3. **Registry lookup by name, at call time.** Never cache a function reference. This is what makes live reload safe.
4. **User and core procedures follow the same protocol.** Same registration, same signature shape, same introspection, same invocation.
5. **The kernel does not know about specific procedures.** If the kernel grows knowledge of `read` or `edit` or `bash`, that knowledge is a bug — push it into the library.
6. **Introspection is a procedure, not a special feature.** `apropos`, `describe`, `source` are plain procedures in the registry.
7. **Hooks resolve at fire time.** Same principle as function resolution.
8. **Procedures return HTML fragments when the output is user-facing.** Plain data when the output is for another procedure. The agent and the UI consume the same thing.

## What Becomes Possible

- **Per-project agents.** A repo's `.hyper/init.ts` + `.hyper/lib/*.ts` completely define what the agent can do in that project. Check it into git; your team's agent is the same as yours.
- **Domain-specific agents.** A FHIR project ships a library of `fhir.*` procedures; the agent in that project thinks in FHIR primitives. A Rust project ships `cargo.*`.
- **Self-extending sessions.** Mid-task, the agent recognizes a pattern, writes a helper to `.hyper/lib/`, calls `persist(name)`, and uses it immediately — and next time.
- **User-authored tools without forking the core.** Drop a file, or `define` it in the REPL; the agent, the UI, and tests all see it.
- **A library you can read.** Every capability is a TypeScript function with a name and a docstring. The whole system is legible in a way per-tool JSON schemas never are.
- **Live UI development.** Edit a view procedure, save, the next render uses the new version. No build step, no reload beyond a fragment swap.

## What This Replaces

- `tool_*.ts` → `lib/*.ts`. The tool abstraction collapses into "procedure."
- Per-tool JSON schemas → one tool (`evalCode`) + introspection procedures.
- Settings UI → REPL.
- Configuration files → `.hyper/init.ts` (which is just code).
- The `tool_hyper_ui` indirection → every procedure can return HTML directly.

The shape of Hyper Code — procedural, ctx-threaded, stateless, SQLite-backed, SSR-rendered, htmx/Datastar-driven — does not change. What changes is that **"tool," "view," "route," and "hook" collapse into one thing: procedure.** The kernel stops knowing what kind of procedure anything is.

## Non-Goals

- **Sandboxing evalCode.** The agent runs in the user's own dev environment and already has shell access. A sandbox here would be security theater. This design assumes trust in the project's `.hyper/` directory, as `git` and `npm` trust a repo's hooks and scripts.
- **A DSL.** The library is TypeScript. No custom syntax, no macro system, no config language. If you want a macro, write a function.
- **Cross-language plugins.** The library is TypeScript. Other languages are reachable through `bash(...)`, but the library itself is one language for coherence.
- **A JSON API in addition to hypermedia.** If something needs to consume structured data, it can call a procedure. The external interface is hypermedia.

## Open Questions

- **Interactive flows inside evalCode.** `dialog()`, `widget()`, `subagent()` need to suspend the agent turn, render UI, and resume with a result. Mechanism: Bun worker with suspend/resume, or temp-file + re-entry, or async-generator yields? To be decided.
- **Streaming granularity.** Each procedure call inside one evalCode should appear as its own UI block as it happens, not wait for the whole eval to finish. The event-bus protocol for that needs design.
- **Approval granularity.** "Allow `edit`, deny `bash`" is harder when everything is `evalCode`. Likely solution: approvals register on procedure names via a `before-call` hook.
- **REPL scope.** Is the REPL session-scoped (default) or global? `define` in memory per session; `persist` global. Needs to be settled.
- **Marking "who did what."** When a human runs `edit(...)` from the REPL, how does it appear in the session log? Likely a new event type `repl_call`, visually distinct from agent tool calls but equal in the event bus.
- **Weaker models.** Code-as-action works well with strong models. Weaker local models may need a fallback "classic tools" mode, or simply not be supported.
