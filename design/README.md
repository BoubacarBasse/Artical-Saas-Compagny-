# Design brief — Article Orders client dashboard

**For Claude Design. Start here.**

A content-writing business needs a client-facing dashboard. Clients sign up, order articles, follow
them through production, and download the finished piece. The application is already built up to
the point where the design begins: routing, data model, validation, auth guard and tests all exist.
Every page is currently an unstyled placeholder, waiting for this.

**Nothing in this folder makes a visual decision.** No colours, no type, no spacing, no layout.
Those choices are yours. What this folder does is say exactly what has to be designed, what real
content goes in it, and what the system can actually do.

---

## There is a reference

This app is being modelled on a dashboard the client already likes — a three-item sidebar
(Dashboard · My Tasks · Inbox), a stat row, a completion chart, a task table with status badges and
assignee avatars, and an order detail page with a details panel and a timeline. The data model in
this brief was rebuilt to support that shape exactly.

Treat it as the intended *structure*, not as the visual answer. The look is still open.

---

## The files

| File | What it is |
|---|---|
| `01-product.md` | What the product is, who uses it, and the quirks that shape the UI |
| `02-screens.md` | **The brief proper** — every screen, every state, as required artboards |
| `03-data-and-content.md` | Real field names, real limits, real copy, and the few things the data cannot do |
| `04-tokens.md` | The token slots the code already has, for you to fill in |
| `fixtures/orders.json` | Thirteen real orders across five statuses — use these, not lorem ipsum |
| `fixtures/order-events.json` | The timeline entries behind those orders |
| `fixtures/notifications.json` | Five inbox items, two unread |
| `fixtures/dashboard.json` | The exact stat counts and chart series the app computes |
| `fixtures/profile.json` | A real user profile with preferences |
| `fixtures/edge-cases.json` | Eleven awkward records: longest title, overdue, ten keywords, four assignees |

Read `03-data-and-content.md` before `02-screens.md`.

---

## What to hand back

1. **The editable canvas**, so the work can be reviewed and adjusted in place.
2. **One PNG per artboard**, as the reference the implementation is built against.
3. **The token values written down** — actual colours, type scale, spacing steps — in the table in
   `04-tokens.md`.

Point 3 matters more than it looks. Reading hex values off a PNG is how small inconsistencies get
baked into a design system permanently. Ten minutes filling in that table saves a day of drift.

---

## Push back rather than design around a gap

If a screen would be better with data the system does not store, **say so instead of designing
around it.** That is a product decision, not a design one, and it can be made. Adding a field is
cheap; discovering after the fact that a finished screen cannot be built is not.

The short list of what does not exist is at the end of `03-data-and-content.md`.

---

## Three constraints, before anything else

- **Light mode only.** No dark palette is needed. Do not design one.
- **Clients never change an order's status, priority, or who is assigned to it.** Staff do that by
  hand in the database. Nothing in this interface is a control for moving work forward — the client
  orders, watches, and downloads.
- **The chart is at agency scale.** One client completes one to three pieces a month, not hundreds.
  The real series is in `fixtures/dashboard.json`. Design for those numbers, including the month
  with a zero.
