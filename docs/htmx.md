---
name: htmx
description: htmx documentation reference — attributes, headers, events, JS API, extensions, examples, and essays. Use when user asks about htmx usage, attributes, swap strategies, triggers, SSE/WS, or needs to look up htmx patterns.
---

# htmx Docs Reference

Full htmx documentation available locally at `docs/htmx_reference/www/content/`. 185 markdown files covering the complete htmx v2.x API.

All paths below are relative to `docs/htmx_reference/www/content/`.

## Docs Structure

### Core Docs (root level)

| File | Content |
|------|---------|
| `docs.md` | Main documentation — installing, AJAX, triggers, swapping, sync, OOB, history, security, config |
| `api.md` | JavaScript API — `htmx.ajax()`, `htmx.process()`, `htmx.trigger()`, `htmx.swap()`, etc. |
| `reference.md` | Quick reference tables — all attributes, headers, events, CSS classes, config options |
| `events.md` | All htmx events with `detail` properties — lifecycle, errors, history, SSE, validation, XHR |

### Attributes (`attributes/`) — 33 files

Core request attributes:
- `hx-get.md`, `hx-post.md`, `hx-put.md`, `hx-patch.md`, `hx-delete.md` — HTTP verbs

Core behavior attributes:
- `hx-trigger.md` — event triggers (click, change, keyup, polling, intersect, load, revealed, filters)
- `hx-target.md` — target element for swap (CSS selector, `this`, `closest`, `find`, `next`, `previous`)
- `hx-swap.md` — swap strategy (innerHTML, outerHTML, beforebegin, afterend, delete, none + modifiers: scroll, show, transition, settle, focus-scroll)
- `hx-swap-oob.md` — out-of-band swaps (update multiple DOM locations from one response)
- `hx-select.md`, `hx-select-oob.md` — pick fragments from response HTML

Additional attributes:
- `hx-boost.md` — progressive enhancement for links/forms
- `hx-push-url.md`, `hx-replace-url.md` — browser history management
- `hx-indicator.md` — loading indicators
- `hx-confirm.md`, `hx-prompt.md` — user confirmation dialogs
- `hx-vals.md` — add JSON values to requests; `hx-params.md` — filter parameters
- `hx-headers.md` — custom request headers
- `hx-include.md` — include additional inputs in request
- `hx-sync.md` — synchronize requests between elements (drop, abort, queue)
- `hx-encoding.md` — multipart/form-data for file uploads
- `hx-ext.md` — enable extensions; `hx-disable.md` — disable htmx processing
- `hx-disinherit.md`, `hx-inherit.md` — control attribute inheritance
- `hx-history.md`, `hx-history-elt.md` — history cache control
- `hx-preserve.md` — keep elements unchanged between swaps
- `hx-request.md` — configure timeout, credentials, noHeaders
- `hx-validate.md` — force validation before request
- `hx-on.md` — inline event handlers (`hx-on:click`, `hx-on::after-request`, etc.)
- `hx-disabled-elt.md` — disable elements during requests

### Response Headers (`headers/`) — 6 files

- `hx-location.md` — client-side redirect without full page reload
- `hx-push-url.md` — server-driven URL push to history
- `hx-redirect.md` — full client-side redirect
- `hx-replace-url.md` — replace URL in location bar
- `hx-trigger.md` — trigger client-side events from server response (JSON event data)
- `hx-push.md` — deprecated, use hx-push-url

### Extensions (`extensions/`) — 9 files

- `sse.md` — Server-Sent Events (`sse-connect`, `sse-swap`, `sse-close`)
- `ws.md` — WebSockets (`ws-connect`, `ws-send`)
- `idiomorph.md` — morphing swap strategy (preserves DOM state)
- `head-support.md` — merge `<head>` elements between swaps
- `preload.md` — preload linked content on mousedown/mouseover
- `response-targets.md` — target different elements based on HTTP status codes
- `htmx-1-compat.md` — backward compatibility with htmx 1.x
- `building.md` — how to build custom extensions

### Examples (`examples/`) — 28 files

Common UI patterns with full HTML:
- `active-search.md` — actively search a contacts DB as user types, with debounce via `hx-trigger="keyup changed delay:500ms"`
- `animations.md` — CSS transitions and View Transitions API for smooth add/remove/swap animations
- `async-auth.md` — async auth token flow using `htmx:confirm` event to pause requests until token is refreshed
- `bulk-update.md` — select rows with checkboxes, bulk update via form submission with `hx-post` + `hx-include`
- `click-to-edit.md` — inline editing: click a record to swap in an edit form, save swaps back the view
- `click-to-load.md` — "load more" button at end of table rows, replaces itself with next page via `hx-swap="outerHTML"`
- `confirm.md` — custom confirmation with SweetAlert2 instead of native `confirm()`, using `htmx:confirm` event
- `delete-row.md` — delete button on table row with `hx-delete`, CSS fade-out transition on removal
- `dialogs.md` — native browser dialogs via `hx-prompt` and `hx-confirm` attributes, values sent as headers
- `edit-row.md` — editable table rows: click "edit" swaps row to input fields, "save"/"cancel" swap back
- `file-upload.md` — ajax file upload form with `hx-encoding="multipart/form-data"` and progress bar via `htmx:xhr:progress`
- `file-upload-input.md` — preserve file input values after server-side form errors using `hx-preserve`
- `infinite-scroll.md` — last row triggers load via `hx-trigger="revealed"`, swaps in next page with `hx-swap="afterend"`
- `inline-validation.md` — per-field validation on blur, server returns field + error message via `hx-post`
- `keyboard-shortcuts.md` — keyboard shortcut triggers content load using `hx-trigger="keyup[key=='/''] from:body"`
- `lazy-load.md` — lazy load content on page load with `hx-trigger="load"`, show spinner via `hx-indicator`
- `modal-bootstrap.md` — server-rendered modal content + Bootstrap JS to show/hide modal dialog
- `modal-custom.md` — custom modal from scratch: server returns modal HTML, CSS handles overlay + positioning
- `modal-uikit.md` — UIKit modal integration with htmx, server-rendered dialog content
- `progress-bar.md` — polling progress bar: server returns updated width, re-triggers poll until complete
- `reset-user-input.md` — reset form inputs after submit using `hx-on::after-request` to clear values
- `sortable.md` — drag-and-drop with Sortable.js, `htmx:afterSettle` re-initializes after swaps
- `tabs-hateoas.md` — tabs following HATEOAS: each tab is a link with `hx-get`, server returns tab content
- `tabs-javascript.md` — tabs with JS: `hx-get` loads content, JS toggles active class on tab buttons
- `update-other-content.md` — update multiple page areas: OOB swaps, `hx-select-oob`, events, or `HX-Trigger` header
- `value-select.md` — cascading selects: changing one select triggers `hx-get` to reload dependent options
- `web-components.md` — htmx inside shadow DOM web components, handling htmx attribute processing
- `move-before/` — experimental `moveBefore()` DOM API with `hx-preserve` to move elements without re-creating them

### Essays (`essays/`) — ~45 files

Architecture and concepts:
- `hypermedia-driven-applications.md` — HDA architecture overview
- `hateoas.md` — HATEOAS explained
- `rest-explained.md` — what REST actually means
- `locality-of-behaviour.md` — LoB principle
- `hypermedia-friendly-scripting.md` — scripting in htmx apps
- `spa-alternative.md` — htmx as SPA alternative
- `when-to-use-hypermedia.md` — decision framework
- `web-security-basics-with-htmx.md` — security considerations
- `splitting-your-apis.md` — hypermedia vs data APIs
- `does-hypermedia-scale.md` — scalability discussion
- `a-real-world-react-to-htmx-port.md` — React migration story
- `view-transitions.md` — View Transitions API
- `template-fragments.md` — server-side template fragments
- `mcp_apps_hypermedia.md` — MCP + hypermedia

### Migration Guides (root level)

- `migration-guide-htmx-1.md` — upgrading from htmx 1.x to 2.x
- `migration-guide-intercooler.md` — migrating from Intercooler.js
- `migration-guide-hotwire-turbo.md` — migrating from Hotwire Turbo

### Other

- `server-examples.md` — server-side integration examples
- `QUIRKS.md` — browser quirks and workarounds
- `posts/` — 30 release notes (v0.0.1 through v2.0.0)

## How to Search

All docs are markdown in `docs/htmx_reference/www/content/`. Use Grep/Read directly.

### Find attribute docs
```
# Read a specific attribute
Read docs/htmx_reference/www/content/attributes/hx-swap.md

# Search across all attributes
Grep pattern="scroll" path="docs/htmx_reference/www/content/attributes"
```

### Find how to do something
```
# Search examples for a pattern
Grep pattern="infinite" path="docs/htmx_reference/www/content/examples"

# Search all docs for a topic
Grep pattern="file upload" path="docs/htmx_reference/www/content" -i
```

### Find events
```
# List all events
Grep pattern="### Event - " path="docs/htmx_reference/www/content/events.md" output_mode="content"

# Search for specific event details
Grep pattern="beforeSwap" path="docs/htmx_reference/www/content/events.md" output_mode="content" -C=5
```

### Find JS API methods
```
Grep pattern="### Method" path="docs/htmx_reference/www/content/api.md" output_mode="content"
```

### Find config options
```
Grep pattern="htmx.config\." path="docs/htmx_reference/www/content/reference.md" output_mode="content"
```

### Search essays/concepts
```
Grep pattern="hypermedia" path="docs/htmx_reference/www/content/essays"
```

### Search response headers
```
Grep pattern="HX-Trigger" path="docs/htmx_reference/www/content/headers" output_mode="content" -C=3
```

### Find extension usage
```
Read docs/htmx_reference/www/content/extensions/sse.md
Grep pattern="sse-connect" path="docs/htmx_reference/www/content"
```
