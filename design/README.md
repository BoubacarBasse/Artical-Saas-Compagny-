# Design brief — Article Orders client dashboard

**For Claude Design. Start here.**

A content-writing business needs a client-facing dashboard. Clients sign up, order articles, and
follow those articles through production. The application is already built up to the point where
the design begins: routing, data model, validation, auth guard and tests all exist. Every page is
currently an unstyled placeholder, waiting for this.

**Nothing in this folder makes a visual decision.** No colours, no type, no spacing, no layout.
That is deliberate — those choices are yours. What this folder does is tell you exactly what has
to be designed, what real content goes in it, and what the system can and cannot actually do.

---

## The files

| File | What it is |
|---|---|
| `01-product.md` | What the product is, who uses it, and two quirks that shape the UI |
| `02-screens.md` | **The brief proper** — every screen, every state, as required artboards |
| `03-data-and-content.md` | Real field names, real limits, real copy, and what the data cannot support |
| `04-tokens.md` | The token slots the code already has, for you to fill in |
| `fixtures/orders.json` | Five real orders — use these, not lorem ipsum |
| `fixtures/profile.json` | A real user profile with preferences |
| `fixtures/edge-cases.json` | Eight awkward records: longest title, overdue, cancelled, no deadline |

Read `03-data-and-content.md` before `02-screens.md`. It has a section called *What the data can
and cannot support*, and it will save you designing something that cannot be built.

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

If a screen would be better with data the system does not store — per-stage timestamps, turnaround
time, an on-time percentage, a message thread, an attached file — **say so instead of designing
around it.** That is a product decision, not a design one, and it can be made. Adding a field is
cheap; discovering after the fact that a finished screen cannot be built is not.

The list of what does and does not exist is in `03-data-and-content.md`.

---

## Two constraints, before anything else

- **Light mode only.** No dark palette is needed. Do not design one.
- **Clients never change an order's stage.** Staff advance orders by hand in the database. Nothing
  in this interface is a control for moving work forward — the client watches, and orders.
