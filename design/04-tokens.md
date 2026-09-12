# 04 — Design tokens

The code already has a token layer at `src/app/globals.css`. Components consume tokens only —
no literal colour values in markup — so whatever you decide lands in one file and applies
everywhere.

**Please fill in the Value column.** Reading hex values off a PNG is how small inconsistencies get
baked in permanently, and this table is about ten minutes of work.

---

## The values currently in the file are placeholders, not a palette

`--color-accent` is `#1a1a1a` today. That is not a brand decision — it is a neutral stand-in so the
application compiles. **Do not read the current values as direction.** Every one of them is expected
to change.

## Add whatever you need

This list is a mapping target, not a cage. If the design needs tokens that do not exist here —
more surface levels, a separate hover colour per variant, a dedicated colour for overdue — add
rows. New tokens are cheap. Hardcoded values are what cost us later.

---

## Requirements, not suggestions

- **Light mode only.** No dark values needed.
- **Body text at 4.5:1 contrast minimum** against its background; large text at 3:1. `--color-fg-subtle`
  is the one most likely to fail — it is the quietest token and still has to be readable.
- **The focus ring must be visible against every surface it can appear on.** Keyboard navigation is
  the whole of this app for some users.
- **The six stage colours must be distinguishable from one another**, and should read as
  in-progress / finished / cancelled without relying on colour alone — the badge carries a text
  label, so colour is reinforcement rather than the only signal.


## Surfaces

Page background, card and panel fills, subtle fills such as table stripes, and the two border weights.

| Token | Current placeholder | Value |
|---|---|---|
| `--color-canvas` | `#ffffff` | |
| `--color-surface` | `#ffffff` | |
| `--color-surface-muted` | `#f6f6f6` | |
| `--color-border` | `#e2e2e2` | |
| `--color-border-strong` | `#c8c8c8` | |


## Text

Body text, secondary text, the quietest readable text, and text on a dark fill.

| Token | Current placeholder | Value |
|---|---|---|
| `--color-fg` | `#171717` | |
| `--color-fg-muted` | `#5c5c5c` | |
| `--color-fg-subtle` | `#8a8a8a` | |
| `--color-fg-inverted` | `#ffffff` | |


## Accent and interaction

Primary action colour, its hover, text sitting on it, and the keyboard focus ring.

| Token | Current placeholder | Value |
|---|---|---|
| `--color-accent` | `#1a1a1a` | |
| `--color-accent-hover` | `#000000` | |
| `--color-accent-fg` | `#ffffff` | |
| `--color-focus` | `#2563eb` | |


## Semantic feedback

Each pairs a foreground with a tinted background for banners and inline messages.

| Token | Current placeholder | Value |
|---|---|---|
| `--color-danger` | `#b42318` | |
| `--color-danger-surface` | `#fef3f2` | |
| `--color-success` | `#067647` | |
| `--color-success-surface` | `#ecfdf3` | |
| `--color-warning` | `#b54708` | |
| `--color-warning-surface` | `#fffaeb` | |
| `--color-info` | `#175cd3` | |
| `--color-info-surface` | `#eff8ff` | |


## Pipeline stages

One per stage, used by the badge and the progress indicator.

| Token | Current placeholder | Value |
|---|---|---|
| `--color-stage-brief-received` | `#667085` | |
| `--color-stage-writing` | `#175cd3` | |
| `--color-stage-editing` | `#7a5af8` | |
| `--color-stage-review` | `#b54708` | |
| `--color-stage-delivered` | `#067647` | |
| `--color-stage-cancelled` | `#b42318` | |


## Radii

Corner rounding steps.

| Token | Current placeholder | Value |
|---|---|---|
| `--radius-sm` | `0.25rem` | |
| `--radius-md` | `0.375rem` | |
| `--radius-lg` | `0.5rem` | |
| `--radius-xl` | `0.75rem` | |
| `--radius-full` | `9999px` | |


## Elevation

Shadow steps.

| Token | Current placeholder | Value |
|---|---|---|
| `--shadow-sm` | `0 1px 2px 0 rgb(16 24 40 / 0.05)` | |
| `--shadow-md` | `0 4px 8px -2px rgb(16 24 40 / 0.10), 0 2…` | |
| `--shadow-lg` | `0 12px 16px -4px rgb(16 24 40 / 0.08), 0…` | |


---

## Not yet tokenised — please specify

These have no slots in the code yet because inventing them before seeing a design would have been
a design decision. Supply whatever the work needs and they will be added.

| What | Needed |
|---|---|
| **Type family** | Body and headings. Name the fonts and where they come from |
| **Type scale** | The sizes actually used, with weight and line-height for each |
| **Spacing** | Tailwind's default scale is available. Say if the design needs a different rhythm |
| **Container widths** | Max content width, and the breakpoints where layout changes |
| **Icons** | Which set, and at what sizes |

---

## How this gets used

Every value here becomes a CSS custom property in `src/app/globals.css`, and every component reads
from it. Swapping a token updates the whole application. That is the point of filling this in
rather than leaving the values inside the images.
