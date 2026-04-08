---
name: tailwind
description: Tailwind CSS v4 documentation reference — utility classes, responsive design, dark mode, hover/focus states, custom styles, theme configuration, functions/directives, and 170+ utility property docs. Use when user asks about Tailwind CSS classes, styling patterns, responsive breakpoints, or needs to look up Tailwind utilities.
---

# Tailwind CSS Docs Reference

Tailwind CSS is a utility-first CSS framework. Full docs at `docs/tailwind_reference/src/docs/`.

All doc paths below are relative to `docs/tailwind_reference/src/docs/`.

## Docs Structure (192 MDX files)

### Core Concepts (8 files)

- `styling-with-utility-classes.mdx` — **utility-first workflow**: how to style with utilities, why utility classes, combining with components
- `hover-focus-and-other-states.mdx` — **variants**: hover, focus, active, visited, first-child, odd/even, group-hover, peer, before/after, placeholder, file input, media queries, aria, data attributes, open, custom variants
- `responsive-design.mdx` — **breakpoints**: sm/md/lg/xl/2xl, mobile-first, custom breakpoints, container queries
- `dark-mode.mdx` — dark mode: media strategy, class strategy, custom variants
- `adding-custom-styles.mdx` — custom utilities, @apply, arbitrary values `[...]`, custom properties `(...)`
- `detecting-classes-in-source-files.mdx` — content detection, safelist, blocklist, how Tailwind scans classes
- `functions-and-directives.mdx` — `@theme`, `@source`, `@utility`, `@variant`, `@apply`, `@reference`, `@import "tailwindcss"`
- `theme.mdx` — **theme configuration**: `@theme { }` block, CSS variables, `--color-*`, `--spacing`, `--font-*`, `--breakpoint-*`, extending vs overriding

### Setup & Migration (4 files)

- `compatibility.mdx` — browser compatibility notes
- `preflight.mdx` — base reset/normalize styles
- `editor-setup.mdx` — VS Code IntelliSense, Prettier plugin
- `upgrade-guide.mdx` — migration from v3 to v4

### Layout (20 files)

- `display.mdx` — block, inline, flex, grid, table, hidden, contents
- `position.mdx` — static, fixed, absolute, relative, sticky
- `top-right-bottom-left.mdx` — inset utilities: top-*, right-*, bottom-*, left-*, inset-*
- `float.mdx` — float-left, float-right, float-none
- `clear.mdx` — clear-left, clear-right, clear-both
- `visibility.mdx` — visible, invisible, collapse
- `z-index.mdx` — z-0 through z-50, z-auto
- `overflow.mdx` — overflow-auto, overflow-hidden, overflow-scroll, overflow-clip
- `overscroll-behavior.mdx` — overscroll-auto, overscroll-contain, overscroll-none
- `isolation.mdx` — isolate, isolation-auto
- `columns.mdx` — columns-1 through columns-12, columns-auto
- `break-after.mdx` / `break-before.mdx` / `break-inside.mdx` — page/column break control
- `box-decoration-break.mdx` — decoration-clone, decoration-slice
- `box-sizing.mdx` — box-border, box-content
- `object-fit.mdx` — object-cover, object-contain, object-fill, object-none
- `object-position.mdx` — object-center, object-top, etc.
- `aspect-ratio.mdx` — aspect-auto, aspect-square, aspect-video

### Flexbox (8 files)

- `flex.mdx` — flex-1, flex-auto, flex-initial, flex-none
- `flex-basis.mdx` — basis-0, basis-1/2, basis-full, basis-auto
- `flex-direction.mdx` — flex-row, flex-col, flex-row-reverse, flex-col-reverse
- `flex-wrap.mdx` — flex-wrap, flex-nowrap, flex-wrap-reverse
- `flex-grow.mdx` — grow, grow-0
- `flex-shrink.mdx` — shrink, shrink-0
- `order.mdx` — order-1 through order-12, order-first, order-last, order-none

### Grid (6 files)

- `grid-template-columns.mdx` — grid-cols-1 through grid-cols-12, grid-cols-none, grid-cols-subgrid
- `grid-template-rows.mdx` — grid-rows-*, grid-rows-subgrid
- `grid-column.mdx` — col-span-*, col-start-*, col-end-*
- `grid-row.mdx` — row-span-*, row-start-*, row-end-*
- `grid-auto-columns.mdx` / `grid-auto-rows.mdx` — auto-cols-auto, auto-cols-min, auto-cols-max, auto-cols-fr
- `grid-auto-flow.mdx` — grid-flow-row, grid-flow-col, grid-flow-dense
- `gap.mdx` — gap-*, gap-x-*, gap-y-*

### Alignment (6 files)

- `justify-content.mdx` — justify-start, justify-center, justify-between, justify-around, justify-evenly
- `justify-items.mdx` / `justify-self.mdx` — justify-items-start, justify-self-auto, etc.
- `align-content.mdx` / `align-items.mdx` / `align-self.mdx` — items-start, items-center, items-stretch, self-auto
- `place-content.mdx` / `place-items.mdx` / `place-self.mdx` — place-content-center, place-items-center

### Sizing (10 files)

- `width.mdx` — w-0, w-px, w-full, w-screen, w-auto, w-1/2, w-fit, w-min, w-max
- `height.mdx` — h-*, h-screen, h-full, h-dvh, h-svh, h-lvh
- `min-width.mdx` / `min-height.mdx` — min-w-0, min-w-full, min-h-screen
- `max-width.mdx` / `max-height.mdx` — max-w-sm through max-w-7xl, max-w-prose, max-w-screen-*
- `block-size.mdx` / `inline-size.mdx` — logical properties equivalents
- `min-block-size.mdx` / `max-block-size.mdx` / `min-inline-size.mdx` / `max-inline-size.mdx`

### Spacing (2 files)

- `padding.mdx` — p-*, px-*, py-*, pt-*, pr-*, pb-*, pl-*, ps-*, pe-*
- `margin.mdx` — m-*, mx-*, my-*, mt-*, mr-*, mb-*, ml-*, ms-*, me-*, -m-* (negative)

### Typography (18 files)

- `font-family.mdx` — font-sans, font-serif, font-mono
- `font-size.mdx` — text-xs through text-9xl
- `font-weight.mdx` — font-thin through font-black (100-900)
- `font-style.mdx` — italic, not-italic
- `font-stretch.mdx` — font-stretch condensed/expanded
- `font-variant-numeric.mdx` — tabular-nums, oldstyle-nums, lining-nums
- `font-smoothing.mdx` — antialiased, subpixel-antialiased
- `font-feature-settings.mdx` — font feature OpenType settings
- `letter-spacing.mdx` — tracking-tighter through tracking-widest
- `line-height.mdx` — leading-none through leading-loose, leading-3 through leading-10
- `line-clamp.mdx` — line-clamp-1 through line-clamp-6, line-clamp-none
- `text-align.mdx` — text-left, text-center, text-right, text-justify
- `text-decoration-line.mdx` — underline, overline, line-through, no-underline
- `text-decoration-color.mdx` / `text-decoration-style.mdx` / `text-decoration-thickness.mdx`
- `text-underline-offset.mdx` — underline-offset-*
- `text-transform.mdx` — uppercase, lowercase, capitalize, normal-case
- `text-overflow.mdx` — truncate, text-ellipsis, text-clip
- `text-wrap.mdx` — text-wrap, text-nowrap, text-balance, text-pretty
- `text-indent.mdx` — indent-*
- `text-shadow.mdx` — text-shadow-sm through text-shadow-lg
- `white-space.mdx` — whitespace-normal, whitespace-nowrap, whitespace-pre
- `word-break.mdx` — break-normal, break-all, break-keep
- `overflow-wrap.mdx` — overflow-wrap break-word
- `hyphens.mdx` — hyphens-none, hyphens-manual, hyphens-auto
- `content.mdx` — content-none, content-['...']
- `vertical-align.mdx` — align-baseline, align-top, align-middle, align-bottom

### Colors & Backgrounds (9 files)

- `color.mdx` — text-* colors: text-red-500, text-slate-900, etc.
- `colors.mdx` — **color palette reference**: all built-in colors (slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose)
- `background-color.mdx` — bg-* colors
- `background-image.mdx` — bg-gradient-to-*, bg-none, bg-[url(...)]
- `background-size.mdx` / `background-position.mdx` / `background-repeat.mdx` / `background-attachment.mdx`
- `background-clip.mdx` — bg-clip-border, bg-clip-padding, bg-clip-content, bg-clip-text
- `background-origin.mdx` — bg-origin-border, bg-origin-padding, bg-origin-content
- `background-blend-mode.mdx` / `mix-blend-mode.mdx` — blend modes
- `accent-color.mdx` — accent-* for form controls
- `caret-color.mdx` — caret-* for text cursors
- `color-scheme.mdx` — color-scheme light/dark

### Borders (6 files)

- `border-width.mdx` — border, border-2, border-4, border-8, border-t-*, border-x-*, etc.
- `border-color.mdx` — border-red-500, etc.
- `border-style.mdx` — border-solid, border-dashed, border-dotted, border-double, border-hidden, border-none
- `border-radius.mdx` — rounded-none through rounded-full, rounded-t-*, rounded-l-*, etc.
- `border-collapse.mdx` / `border-spacing.mdx` — table border utilities
- `outline-width.mdx` / `outline-color.mdx` / `outline-style.mdx` / `outline-offset.mdx` — outline utilities

### Effects & Shadows (3 files)

- `box-shadow.mdx` — shadow-sm through shadow-2xl, shadow-inner, shadow-none; shadow color
- `opacity.mdx` — opacity-0 through opacity-100
- `fill.mdx` / `stroke.mdx` / `stroke-width.mdx` — SVG utilities

### Filters (18 files)

- `filter.mdx` — filter, filter-none
- `filter-blur.mdx` — blur-none through blur-3xl
- `filter-brightness.mdx` / `filter-contrast.mdx` / `filter-grayscale.mdx` / `filter-hue-rotate.mdx` / `filter-invert.mdx` / `filter-saturate.mdx` / `filter-sepia.mdx`
- `filter-drop-shadow.mdx` — drop-shadow-sm through drop-shadow-2xl
- `backdrop-filter.mdx` — backdrop-filter, backdrop-filter-none
- `backdrop-filter-blur.mdx` / `backdrop-filter-brightness.mdx` / `backdrop-filter-contrast.mdx` / `backdrop-filter-grayscale.mdx` / `backdrop-filter-hue-rotate.mdx` / `backdrop-filter-invert.mdx` / `backdrop-filter-opacity.mdx` / `backdrop-filter-saturate.mdx` / `backdrop-filter-sepia.mdx`

### Transforms (7 files)

- `transform.mdx` — transform, transform-gpu, transform-none
- `translate.mdx` — translate-x-*, translate-y-*
- `rotate.mdx` — rotate-0 through rotate-180, -rotate-*
- `scale.mdx` — scale-0 through scale-150, scale-x-*, scale-y-*
- `skew.mdx` — skew-x-*, skew-y-*
- `transform-origin.mdx` — origin-center, origin-top, origin-top-right, etc.
- `transform-style.mdx` — transform-flat, transform-3d
- `perspective.mdx` / `perspective-origin.mdx` — 3D perspective
- `backface-visibility.mdx` — backface-visible, backface-hidden

### Transitions & Animation (6 files)

- `transition-property.mdx` — transition, transition-colors, transition-opacity, transition-shadow, transition-transform, transition-all, transition-none
- `transition-duration.mdx` — duration-75 through duration-1000
- `transition-timing-function.mdx` — ease-linear, ease-in, ease-out, ease-in-out
- `transition-delay.mdx` — delay-75 through delay-1000
- `transition-behavior.mdx` — transition-behavior discrete/normal
- `animation.mdx` — animate-spin, animate-ping, animate-pulse, animate-bounce, custom keyframes

### Masks (9 files)

- `mask-image.mdx` / `mask-size.mdx` / `mask-position.mdx` / `mask-repeat.mdx`
- `mask-clip.mdx` / `mask-composite.mdx` / `mask-mode.mdx` / `mask-origin.mdx` / `mask-type.mdx`

### Interactivity (8 files)

- `cursor.mdx` — cursor-auto, cursor-pointer, cursor-wait, cursor-text, cursor-move, cursor-not-allowed, etc.
- `pointer-events.mdx` — pointer-events-none, pointer-events-auto
- `user-select.mdx` — select-none, select-text, select-all, select-auto
- `resize.mdx` — resize, resize-none, resize-x, resize-y
- `scroll-behavior.mdx` — scroll-auto, scroll-smooth
- `scroll-margin.mdx` / `scroll-padding.mdx` — scroll-m-*, scroll-p-*
- `scroll-snap-type.mdx` / `scroll-snap-align.mdx` / `scroll-snap-stop.mdx` — snap-x, snap-y, snap-start, snap-center, snap-end
- `touch-action.mdx` — touch-auto, touch-none, touch-pan-x, touch-pan-y, touch-pinch-zoom, touch-manipulation
- `will-change.mdx` — will-change-auto, will-change-scroll, will-change-contents, will-change-transform
- `appearance.mdx` — appearance-none, appearance-auto
- `field-sizing.mdx` — field-sizing-content, field-sizing-fixed
- `forced-color-adjust.mdx` — forced-color-adjust-auto, forced-color-adjust-none

### Tables (2 files)

- `table-layout.mdx` — table-auto, table-fixed
- `caption-side.mdx` — caption-top, caption-bottom

### Blog posts (`src/blog/`) — ~60 posts

Release notes, feature announcements, ecosystem updates. Not indexed in detail.

## How to Search

### Find utility class docs
```
# Read a specific utility
Read docs/tailwind_reference/src/docs/padding.mdx
Read docs/tailwind_reference/src/docs/flex.mdx

# Search for a utility by keyword
Bash: ls docs/tailwind_reference/src/docs/ | grep -i "grid"
Bash: ls docs/tailwind_reference/src/docs/ | grep -i "shadow"
```

### Find core concept docs
```
Read docs/tailwind_reference/src/docs/hover-focus-and-other-states.mdx
Read docs/tailwind_reference/src/docs/responsive-design.mdx
Read docs/tailwind_reference/src/docs/dark-mode.mdx
Read docs/tailwind_reference/src/docs/theme.mdx
```

### Search docs for a topic
```
Grep pattern="container" path="docs/tailwind_reference/src/docs" -i
Grep pattern="arbitrary" path="docs/tailwind_reference/src/docs" -i
Grep pattern="@apply" path="docs/tailwind_reference/src/docs"
```

### Find color palette
```
Read docs/tailwind_reference/src/docs/colors.mdx
Grep pattern="sky-500" path="docs/tailwind_reference/src/docs"
```

### Find functions and directives
```
Read docs/tailwind_reference/src/docs/functions-and-directives.mdx
Read docs/tailwind_reference/src/docs/adding-custom-styles.mdx
```
