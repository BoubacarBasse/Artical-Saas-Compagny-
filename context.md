# Project context

Read this first. It is written so a new chat can pick the project up cold,
without reading the git history or the rest of the source.

**Branch: `claude/article-ordering-webapp-k6vwb4`. All work goes here.**

---

## Standing instruction: keep this file current

Update `context.md` whenever something meaningful is built or decided —
without being asked. "Meaningful" means: a phase completes, a decision is made
that would be expensive to reverse, the data model changes, a new command or
environment variable appears, or something is verified (or found broken).

Do not log routine edits. This is a handoff document, not a changelog. If a
line would not change what the next person does, it does not belong here.

When you update it, also update **Where things stand** and **What's next** —
a stale status section is worse than no status section, because it is believed.

---

## What this is

A client dashboard for a content-writing business. Clients sign in, order
articles, and follow them through production. One tenant type: the client.

**There is no admin UI, by design.** Staff advance an order by editing the
`status` cell in the Supabase table editor and adding a row to `order_events`.
Everything in the client-facing app is read-only except *create an order* and
*edit your own profile*. This is the single most important thing to understand
about the product, because it is why the permission model looks the way it does.

Light mode only. Committed to in planning; it also halves the token layer.

---

## Where things stand

| Phase | State |
|---|---|
| 0 — design-independent substrate | **Done.** Data layer, auth, routing, RLS, tests. |
| Design | **Done.** Canvas returned from Claude Design, in `design/canvas/`. |
| Backend on real Postgres | **Done and verified.** Migration + seed + RLS proven against Postgres 16. |
| 1 — build the signed-in UI | **Done.** Every route below is real, against the canvas. |
| Deploy to Netlify | Deferred by choice. `netlify.toml` and the plugin are already in place. |

### Phase 1 — what got built

Every placeholder under `src/app/` is gone. Two route groups carry the visual
split: `src/app/(app)/` (dashboard, orders, orders/new, orders/[id], inbox,
settings — wrapped in one shared shell layout with the sidebar, header, search,
and demo-mode banner) and `src/app/(auth)/` (login, signup — a centered card).
Route groups are invisible to the URL and to `middleware.ts`, so nothing about
routing or the guard changed.

**Tokens** (`src/app/globals.css`) now hold the real values pulled out of
`design/canvas/Article Orders.dc.html` — IBM Plex Sans/Mono (loaded via
`next/font/google` in `src/app/layout.tsx`), the warm cream/terracotta palette,
and a bg/fg/dot triple per status rather than the one placeholder colour each
had before. `design/04-tokens.md`'s Value column was never filled in by the
design tool — the canvas file was the real handoff — so the tokens were read
out of its inline styles and JS `STATUS`/`PRIORITY`/`AV_BG` maps instead.

**Mutations are Server Actions** under `src/lib/actions/` (`auth.ts`,
`orders.ts`, `profile.ts`), each a thin wrapper around `src/lib/data` that
revalidates and redirects. Forms use React 19's `useActionState`. The one
`"use server"` export that is not a form action is `searchOrdersAction`,
called directly from the header search modal as an RPC.

**One deliberate divergence from the canvas:** the draft-order panel has no
"Submit this order" or "Edit the brief" button. The canvas wires both to a
no-op (`onClick="{{ noop }}"`) — even the design tool's own prototype never
made them do anything — and there is no `updateOrder` method on `DataProvider`
for a real one to call. Postgres has no client UPDATE policy on `orders` at
all (see **The permission model** below), so adding that button would be
UI promising something the backend cannot do. `draft` means "created, not yet
picked up by staff" — there is nothing for the client to submit.

**Not implemented:** the chart's per-bar hover tooltip is real (a small client
component, `CompletionsChart`), but there is no loading-skeleton or
network-error state on any page — every provider call here resolves
synchronously against the mock cookie or a local Postgres, so there was
nothing to show a skeleton *for*. If Supabase mode ever adds real network
latency worth showing a spinner over, that is where it goes.

Verified end-to-end in mock mode with Playwright, scripted rather than by
hand: sign up → create an order → filter/sort the orders list → open the
order detail page → mark notifications read → edit profile → toggle a
notification preference → set order defaults → change password → sign out →
sign back in with the *new* password. Zero console or page errors across the
run. Not yet re-verified against real Supabase (still gated on Docker in this
environment, see below) — the pages call the same `DataProvider` interface
either way, but that is a claim until it is actually clicked through.

Every page under `src/app/` is still a Phase 0 placeholder — a bare `<h1>` with
a `data-testid`. They exist so routing and the middleware guard are real and
testable. Phase 1 replaces all of them.

---

## The one architectural idea

Everything hangs off a single environment variable.

```
DATA_SOURCE=mock        cookie-backed demo data, no database   (default)
DATA_SOURCE=supabase    real Postgres + Supabase Auth
```

`src/lib/data/index.ts` is the only file in the app that names either
implementation. Pages and Server Actions import `data` from there and nothing
else. Both implementations satisfy the same `DataProvider` interface in
`src/lib/data/types.ts`.

**If flipping that variable ever requires editing a page, that is the bug** —
fix the leak, not the page. `DATA_SOURCE` is deliberately not prefixed
`NEXT_PUBLIC_`: every data call happens in a Server Component or Server Action,
so neither implementation reaches the browser bundle.

The mock is not a toy. It is cookie-backed rather than a module-level array
specifically so two browser contexts are two independent users, which is what
makes cross-user security tests meaningful on a serverless host.

---

## Data model

Five flat status badges, **not** a pipeline with a percentage:
`draft → in_progress → pending_review → completed | cancelled`.
Single source of truth: `src/lib/orders/statuses.ts`.

This was changed deliberately — an earlier version had a six-stage pipeline with
progress percentages. The reference screens show a badge and no progress bar,
and with staff advancing orders by hand, fewer states means fewer chances for
hand-maintained data to go stale. Do not reintroduce the percentage.

Tables (`supabase/migrations/0001_init.sql`):

- **`profiles`** — one per auth user, created by a trigger on `auth.users`.
  `preferences` is `jsonb` so design-driven toggles do not each need a migration.
- **`orders`** — `order_number` comes from a sequence, so it is never reused.
  `assignees` and `deliverable` are `jsonb`, written by staff.
- **`order_events`** — append-only history. This is what lets the detail-page
  timeline show *when* something happened, and where the dashboard chart gets
  its dates. Without it both features are guesswork.
- **`notifications`** — drives the inbox and its unread badge.

`src/lib/orders/stats.ts` derives every dashboard figure from raw rows as pure
functions, so mock and Supabase cannot disagree about what the numbers mean.

### Scale is deliberately honest

Thirteen orders across seven months; one to three completions in most months and
at least one month with none. A chart drawn against inflated numbers looks
impressive in a screenshot and then breaks the first time it meets a real
account. Do not "improve" the seed by making it busier.

---

## The permission model

This is the part worth not breaking. It is enforced in the database, not the app.

- Clients get **SELECT and INSERT on `orders`, and nothing else.** No UPDATE
  policy, no DELETE policy, and the privileges are revoked as well as unpoliced
  so the failure is a clear permission error rather than a silent zero-row match.
- The INSERT policy pins `status = 'draft'`. Without that clause, locking down
  UPDATE buys nothing — a client would simply insert an order already marked
  completed and walk off with free work.
- A **column-level INSERT grant** means a client cannot even *name*
  `status`, `priority`, `assignees`, `deliverable` or `order_number`.
- `order_events` is readable only through ownership of the parent order, so an
  id that is not yours returns nothing rather than revealing the order exists.
- On `notifications`, `read_at` is the only column a client may write.
- On `profiles`, the `email` mirror and `created_at` are not client-writable.
- The `deliverables` storage bucket is **private**; the detail page mints a
  short-lived signed URL so a download link cannot be usefully forwarded.

The app also filters by `user_id` everywhere. That is belt-and-braces: if a
policy were wrong, the app filter would hide the mistake rather than fix it.

---

## Running it

### Mock mode — no database

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign up with any email and password. Data is regenerated per user id, so the
dashboard always looks current.

### Supabase mode — real Postgres

Needs Docker running.

```bash
npm run db:start                     # boots local Supabase, applies migration + seed
npm run db:status                    # copy the anon key from here
cp .env.example .env.local           # set NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev:supabase
```

Sign in as **`demo@example.com` / `demo-password-123`** (created by the seed).

- Table editor — http://127.0.0.1:54323 — this is the staff UI.
- `npm run db:reset` wipes and reapplies migration + seed.
- `npm run db:stop` when done.

Local Supabase has **Confirm email OFF**, so sign-up works immediately. A
*hosted* project has it **ON** by default, and v1 has no confirmation screen —
so a new account will exist but be unable to sign in until you either confirm
from the inbox or turn the setting off under Authentication → Providers → Email.
This is the single most common way the hosted setup appears broken when it is not.

`supabase/seed.sql` is **local only**. It writes a user with a known password and
inserts rows as the superuser, bypassing RLS. Never run it against a hosted project.

---

## What is verified, and what is not

Verified against a real Postgres 16, not just reasoned about:

- The migration applies cleanly from scratch.
- The seed produces exactly what the mock produces — 13 orders, 9 completed,
  1 each in progress / pending review / draft / cancelled, 5 notifications with
  2 unread, 53 events.
- Both triggers fire: a new auth user gets a profile; a new order gets its
  `submitted` event.
- A new order inserted as `authenticated` comes out `draft` with a sequence
  number, regardless of what the client asked for.
- **Every RLS claim above was tested by impersonating users at the SQL level.**
  A second user sees zero orders and zero events. The owner cannot mark their own
  order completed, delete it, insert one already completed, create one on another
  account, rewrite a notification title, write their own history, or change their
  profile email. A signed-out caller sees nothing.
- 83 unit tests pass; typecheck clean.

**Not yet verified:** the app talking to Supabase over HTTP. The sandbox this was
built in cannot pull the Supabase Docker images, so PostgREST and GoTrue never
ran. The database layer beneath them is proven; the round trip is not. This is
roughly a two-minute check on a machine with working Docker — `npm run db:start`,
`npm run dev:supabase`, sign in as the demo user, confirm the orders appear. Do
that before building on top of it.

---

## The design

`design/` holds the brief that went to Claude Design. `design/canvas/` holds
what came back — open `design/canvas/Article Orders.dc.html` in a browser.

**Where the two disagree, the code wins on data and the canvas wins on visuals.**
Claude Design drew against its own fixture variant rather than the repo's: it
renamed fields (`n` for `orderNumber`, `words` for `wordCount`), used display
labels where the code uses enums (`"Blog post"` vs `blog_post`), and invented
different writer names and word counts. Do not port those names into the code
when building Phase 1. `src/lib/data/types.ts` is authoritative.

The brief specifies 76 artboards. A minimum viable subset is roughly 30:
foundations, app shell, My Tasks, dashboard, order detail.

---

## What's next

1. **Confirm the Supabase round trip** on a machine with Docker (above) —
   now that Phase 1 exists, this also means actually signing in as the demo
   user and clicking through the real UI, not just checking the database layer.
2. Deploy to Netlify when there is something worth looking at.
3. Longer term, if `draft` orders ever need a real client-initiated action
   (the "Submit this order" button the canvas prototyped but never wired up),
   that needs an `updateOrder` method on `DataProvider` and a matching Postgres
   UPDATE policy — a real product decision, not a UI fix. See **Phase 1 — what
   got built** above.

---

## Conventions

- Do not reintroduce progress percentages or a dark mode without deciding to.
- Keep the mock and Supabase providers behaviourally identical. When they drift,
  a user-visible difference between `npm run dev` and `npm run dev:supabase` is
  the symptom, and the `DataProvider` contract is where the fix goes.
- Error strings are worded identically in both providers on purpose, so one test
  can assert against both.
- `npm run typecheck && npm run test:unit` before committing.
