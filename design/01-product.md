# 01 — The product

## What it is

A content-writing business writes articles and blog posts for other companies. This is the portal
their clients log into. A client can:

- order a new article
- see everything they have ordered and what state it is in
- open a single order, read its brief, and follow its history
- download the finished piece
- manage their own account and preferences

That is the whole product. No marketplace, no writer-facing side, no chat, no invoicing.

## Who is using it

A marketing or content lead at a small-to-mid-size company, ordering on behalf of their employer.
They are not the writer and not a designer. They order in bursts — a few pieces at once, then
nothing for a fortnight — and mostly come back to answer one question: **is my thing ready yet?**

That question is the product's centre of gravity. A returning client should get the answer without
reading anything.

## Navigation

Three items, matching the reference:

- **Dashboard** — the stat row, the completion chart, and recent orders
- **My Tasks** — the full order table, with search, filter and pagination
- **Inbox** — notifications

**Settings lives in the avatar menu, top right**, not in the sidebar. The reference has no settings
nav item, but the client still has to be able to change their password, so it belongs behind the
avatar with the sign-out link.

## Two quirks that shape the interface

### 1. There is no admin UI, so nothing here moves work forward

Staff advance an order by editing a row in the database by hand. That is a deliberate v1 shortcut.
The consequence for you: **the client interface contains no control that changes an order's state.**
No "mark complete", no "approve", no drag-between-columns board, no way to reassign a writer or
raise a priority.

A client can submit exactly three things: a new order, their settings, and a new password. Plus one
more action — marking notifications read.

This makes the app unusually read-heavy. Lean into that rather than inventing buttons for it.

### 2. Light mode only

No dark palette. The account settings have no appearance section.

## What is deliberately not in v1

No admin or staff screens · no per-order messaging or comments · no client file uploads (staff
upload the finished piece; clients only download) · no billing, plans or invoices · no team accounts
or multiple seats · no email notifications actually sending (preferences are stored, nothing is sent
yet) · no password reset by email.

If any of these would obviously improve a screen you are working on, note it rather than adding it.

## Where this sits

The signed-in pages are the priority. The public landing page comes later — it is at the end of
`02-screens.md` and is explicitly lower priority.
