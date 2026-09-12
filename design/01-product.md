# 01 — The product

## What it is

A content-writing business writes articles and blog posts for other companies. This is the portal
their clients log into. A client can:

- order a new article
- see everything they have ordered and how far along it is
- open a single order and read its brief and progress
- manage their own account and preferences

That is the whole product. There is no marketplace, no writer-facing side, no chat, no invoicing.

## Who is using it

A marketing or content lead at a small-to-mid-size company, ordering on behalf of their employer.
They are not the writer and not a designer. They order in bursts — a few articles at once, then
nothing for a fortnight — and mostly come back to answer one question: **is my thing ready yet?**

That question is the product's centre of gravity. A returning client should get the answer without
reading anything.

## Two quirks that shape the interface

### 1. There is no admin UI, so nothing here moves work forward

Staff advance an order by editing one cell in the database by hand. That is a deliberate v1
shortcut. The consequence for you: **the client interface contains no control that changes an
order's state.** No "mark complete", no "approve", no drag-between-columns board. A client creates
orders and watches them; everything else happens elsewhere.

This makes the app unusually read-heavy. There are exactly three things a client can submit: a new
order, their settings, and a new password.

### 2. Light mode only

No dark palette. The account settings have no appearance section.

## What is deliberately not in v1

No admin or staff screens · no per-order messaging or comments · no file attachments or article
delivery through the app · no billing, plans or invoices · no team accounts or multiple seats ·
no email notifications actually sending (the preferences are stored, nothing is sent yet) ·
no password reset by email.

If any of these would obviously improve a screen you are working on, note it rather than adding it.

## Where this sits

The build runs in phases. The signed-in pages are next and are the priority. The public landing
page comes later — it is included at the end of `02-screens.md` and is explicitly lower priority.
