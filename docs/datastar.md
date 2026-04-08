---
name: datastar
description: Datastar documentation reference — attribute plugins, action plugins, SSE events, signals, examples, and essays. Use when user asks about Datastar usage, data-* attributes, signals, SSE protocol, merge fragments, or needs to look up Datastar patterns.
---

# Datastar Docs Reference

Datastar is a hypermedia framework (~11KB) combining Alpine.js-style frontend reactivity with htmx-style backend integration via SSE. Docs at `docs/datastar_reference/`.

All doc paths below are relative to `docs/datastar_reference/`.

## Docs Structure

### Guide (`guide/`) — 4 files

- `getting_started.md` — core concepts: `data-signals`, `data-bind`, `data-text`, `data-on`, `data-computed`, `data-show`, `data-class`, `data-attr`, `data-indicator`; backend SSE integration; `@setAll()`, `@toggleAll()`
- `datastar_expressions.md` — expression syntax: `$signal` access, `@action()` invocation, semicolons, implicit returns, namespaced signals, event context variables
- `going_deeper.md` — philosophy: signals as reactive variables, namespaced signals, backend as source of truth, hypermedia-first, declarative over imperative
- `stop_overcomplicating_it.md` — best practices: avoid unnecessary JS, use web components, "props down events up" pattern, Datastar as orchestration layer

### Reference (`reference/`) — 7 files

- `overview.md` — quick reference table of all plugins, events, SDKs
- `attribute_plugins.md` — **complete attribute reference** (765 lines), all `data-*` attributes:
  - **Core**: `data-signals` (declare reactive signals), `data-computed` (derived values), `data-star-ignore` (skip processing)
  - **DOM**: `data-attr` (set attributes), `data-bind` (two-way binding), `data-class` (toggle classes), `data-on` (event handlers), `data-ref` (element references), `data-show` (conditional display), `data-text` (text content)
  - **Backend**: `data-indicator` (loading state signals)
  - **Browser**: `data-custom-validity`, `data-on-intersect`, `data-on-interval`, `data-on-load`, `data-on-raf`, `data-on-signal-change`, `data-persist`, `data-replace-url`, `data-scroll-into-view`, `data-view-transition`
  - Modifier syntax, attribute ordering rules, casing conventions
- `action_plugins.md` — **complete action reference**:
  - **Backend**: `@get()`, `@post()`, `@put()`, `@patch()`, `@delete()` — with options: contentType, headers, retries, onRequest/onResponse/onError callbacks
  - **Browser**: `@clipboard()` — copy to clipboard
  - **Utility**: `@setAll()`, `@toggleAll()`, `@fit()` — bulk signal operations
- `sse_events.md` — **SSE protocol spec**, 5 event types:
  - `datastar-merge-fragments` — merge HTML (modes: morph, inner, outer, append, prepend, before, after, upsertAttributes)
  - `datastar-merge-signals` — update signal values from server
  - `datastar-remove-fragments` — remove DOM elements by CSS selector
  - `datastar-remove-signals` — remove signals by path
  - `datastar-execute-script` — run JavaScript in browser context
- `sdks.md` — official SDKs: Clojure, C#/.NET, Go, Haskell, Java, PHP (+ Laravel, Craft CMS), Python, Rust, Ruby, TypeScript, Zig
- `security.md` — XSS prevention, escaping user input, `data-star-ignore`, CSP requirements (`unsafe-eval` needed)
- `custom_builds.md` — modular architecture, creating custom bundles with only needed plugins

### Examples (`examples/`) — 74 files

Common UI patterns:
- `active_search.md` — live search with debounce as user types
- `animations.md` — CSS animations triggered by signal changes
- `bad_apple.md` — ASCII animation streaming via SSE with progress tracking
- `bind_keys.md` — bind keyboard events to specific keys
- `bulk_update.md` — select rows with checkboxes and batch update
- `classes.md` — toggle CSS classes based on signal values
- `click_outside.md` — detect clicks outside an element
- `click_to_edit.md` — inline editing: click to swap view for edit form
- `click_to_load.md` — load more items on click
- `cloak.md` — hide element until Datastar initializes (prevent FOUC)
- `csrf.md` — CSRF token handling in requests
- `custom_events.md` — listen to custom browser events
- `custom_validity.md` — custom form validation messages
- `dbmon.md` — database monitoring dashboard (stress test)
- `debounce_and_throttle.md` — debounce/throttle modifiers on events
- `delete_row.md` — delete table row with confirmation
- `dialogs_browser.md` — native browser dialogs with signal binding
- `disable_button.md` — disable submit button during request
- `dispatch_custom_event.md` — dispatch custom events from expressions
- `edit_row.md` — editable table rows
- `execute_script.md` — execute server-sent scripts
- `file_upload.md` — multi-file upload form
- `form_data.md` — form data submission patterns
- `ignore_attributes.md` — skip Datastar processing with `data-star-ignore`
- `img_src_bind.md` — bind image source to signal
- `indicator.md` — loading indicators with `data-indicator`
- `infinite_scroll.md` — scroll-triggered content loading
- `inline_validation.md` — per-field validation on input/blur
- `invalid_signals.md` — handling invalid signal names
- `key_casing.md` — signal key casing conventions (camelCase ↔ kebab-case)
- `lazy_load.md` — load content on page load with `data-on-load`
- `lazy_tabs.md` — tab content loaded on demand
- `merge_options.md` — different fragment merge modes (morph, inner, outer, append, etc.)
- `model_binding.md` — two-way data binding with `data-bind`
- `multi_select.md` — multi-select form elements bound to signals
- `multiline_expressions.md` — multi-statement expressions in attributes
- `multiline_signals.md` — multiline signal declarations
- `offline_sync.md` — persist and sync data when offline/online
- `on_load.md` — trigger backend request on page load
- `persist.md` — persist signals to localStorage/sessionStorage
- `plugin_order.md` — attribute evaluation order requirements
- `polling.md` — regular backend polling with `data-on-interval`
- `prefetch.md` — prefetch resources for carousel/pagination
- `progress_bar.md` — animated progress bar via SSE updates
- `quick_primer_go.md` — full Go backend example with Datastar
- `raf_update.md` — requestAnimationFrame-driven updates
- `redirects.md` — server-initiated page redirects
- `refs.md` — element references as signals via `data-ref`
- `regex.md` — regex in expressions
- `replace_url_from_backend.md` — server-driven URL replacement
- `replace_url_from_signals.md` — client-side URL replacement from signal values
- `scroll_into_view.md` — scroll element into viewport
- `session_storage.md` — persist signals to sessionStorage
- `signals_change.md` — react to signal changes with `data-on-signal-change`
- `signals_ifmissing.md` — set signal only if not already defined
- `signals_ifmissing_onload.md` — ifmissing + on-load pattern
- `sortable.md` — drag-and-drop sorting integration
- `templ_counter.md` — Go templ + Datastar counter example
- `timing.md` — timing and delay modifiers
- `title_update_backend.md` — update page title from server
- `toggle_visibility.md` — toggle element visibility with `data-show`
- `update_signals.md` — update signals from server via SSE
- `value_select.md` — cascading/dependent select dropdowns
- `view_transition_api.md` — View Transitions API integration
- `view_transition_on_click.md` — View Transition triggered on click
- `web_component.md` — Datastar with Web Components

### How-To Guides (`how_tos/`) — 5 files

- `how_to_bind_keydown_events_to_specific_keys.md` — keyboard event handling with key filters
- `how_to_load_more_list_items.md` — append pagination (load more without replacing existing content)
- `how_to_poll_the_backend_at_regular_intervals.md` — polling with `data-on-interval`, dynamic frequency control
- `how_to_redirect_the_page_from_the_backend.md` — redirect using `datastar-execute-script` SSE event
- `how_to_stream_sse_events_with_a_user_defined_delay.md` — controlling SSE event timing from backend

### Essays (`essays/`) — 9 files

- `why_another_framework.md` — motivation: better plugin architecture than Alpine/htmx, backend as truth, JSON up / HTML down
- `another_dependency.md` — size analysis: ~11KB min+gzip, dependency breakdown
- `event_streams_all_the_way_down.md` — why SSE for everything, extending `text/event-stream` for all HTTP methods
- `yes_you_want_a_build_step.md` — counter to htmx "no build step", benefits of TypeScript + build tools
- `the_road_to_v1.md` — journey to v1, community growth, PHP adoption
- `grugs_around_fire.md` — design philosophy, developer experience priorities
- `htmx_sucks.md` — self-critique essay (marketing through honest criticism)
- `i_am_a_teapot.md` — HTTP status codes: frontend should only use 2xx/3xx
- `haikus.md` — Datastar haiku poems

### Tests (`tests/`) — 60+ files

Functional test specs documenting expected behavior:
- Input/forms: `checkbox_boolean`, `checkbox_value`, `checkbox_array`, `select_single`, `select_multiple`, `input_value`, `input_signal`, `radio_value`
- Fragments: `merge_fragment`, `merge_fragment_signals`, `merge_fragment_on_load`, `remove_fragment`
- Signals: `persist_signals`, `set_all_paths`, `toggle_all_path`, `on_signal_change`, `local_signals`
- Events: `on_load`, `on_load_delay`, `on_signal_change_path`, `sse_events`, `sse_error_event`
- Misc: `ref`, `custom_plugin`, `key_casing`, `aliased`, `indicator`

### SDK Source (`datastar/sdk/`) — multi-language

Official SDK implementations in the repo: Go, Python, TypeScript, Rust, Clojure, Java, PHP, .NET, Ruby, Haskell, Zig.
- `sdk/ADR.md` — architecture decision record for SDK protocol design
- `sdk/test/` — SDK conformance test cases (GET/POST)

## How to Search

### Find attribute docs
```
# Read the complete attribute reference
Read datastar/docs/md/reference/attribute_plugins.md

# Search for a specific attribute
Grep pattern="data-bind" path="datastar/docs/md/reference"
```

### Find action docs
```
Read datastar/docs/md/reference/action_plugins.md
Grep pattern="@get" path="datastar/docs/md/reference"
```

### Find SSE event types
```
Read datastar/docs/md/reference/sse_events.md
Grep pattern="merge-fragments" path="datastar/docs/md"
```

### Find examples by pattern
```
Grep pattern="infinite" path="datastar/docs/md/examples"
Grep pattern="data-on-load" path="datastar/docs/md/examples"
```

### Search all docs for a topic
```
Grep pattern="persist" path="datastar/docs/md" -i
Grep pattern="morph" path="datastar/docs/md"
```

### Search SDK source
```
Grep pattern="MergeFragments" path="datastar/datastar/sdk"
Read datastar/datastar/sdk/ADR.md
```

### Find test behavior specs
```
Grep pattern="checkbox" path="datastar/docs/md/tests"
```
