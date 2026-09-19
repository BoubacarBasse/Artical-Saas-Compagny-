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
`status` cell in the Supabase table editor — and that is now the *only* thing
they touch. Migration `0002` derives the `order_events` row and the client
notification from the change itself, in the same transaction.

That used to be three manual steps (edit the status, remember to add the
history row, remember to add the notification), which is a drift generator:
miss the second and the detail page shows a "Completed" badge above a timeline
that stops at "submitted"; miss the third and the client is never told. Both
failures were silent. Uploading a finished file into the `deliverable` column
records its own `delivered` event the same way.

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
| Hosted Supabase | **Live and verified.** Schema pushed; app signed in against it with the banner gone. |
| Order-notification email | **Written, never run.** Edge Function committed, not deployed. |
| Password reset | **Missing.** No link, no route, no provider method. |
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

### Hosted Supabase

```bash
npx supabase login
npx supabase link --project-ref <ref>   # asks for the database password
npx supabase db push                    # applies every migration
```

Then set `DATA_SOURCE=supabase`, `NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`
and the **anon / publishable** key in `.env.local` and run `npm run dev`.

Two traps worth naming, because both look like the app is broken when it is not:

1. `.env.example` ships the *local* URL (`http://127.0.0.1:54321`). Copy it as a
   starting point and you will be pointed at a Docker container that isn't running.
2. `npm run dev:supabase` is Unix-only syntax and fails in PowerShell. Putting
   `DATA_SOURCE=supabase` in `.env.local` works everywhere, which is why that is
   the documented route rather than the script.

**The demo-mode banner is the tell.** If the amber "Demo data" strip is across the
top, you are on the mock and nothing you do is touching Postgres, whatever the
env file says.

`supabase/seed_hosted.sql` puts the same thirteen sample orders on a hosted
project. Unlike `seed.sql` it creates no users — it looks up an account you
already signed up for, by email, and refuses with a readable message if that
account does not exist or already has orders. Paste the whole file into the SQL
editor, change the one marked email line, run it; the cleanup statement at the
bottom removes everything it inserted.

The email used to live in a `\set` variable, which was wrong: `\set` is a psql
client command and the SQL editor talks to the server directly, so it never
sees it. That made the file impossible to run without hand-editing, and the
hand-edit is what broke it — the first real attempt mangled a table name three
statements away from the line being changed. A script that only works after you
edit it should be edited in exactly one obvious place, and that place should be
a normal part of the language it is written in.

---

## What is verified, and what is not

Verified against a real Postgres 16, not just reasoned about:

- The migration applies cleanly from scratch.
- The seed produces exactly what the mock produces — 13 orders, 9 completed,
  1 each in progress / pending review / draft / cancelled, 5 notifications with
  2 unread, 53 events.
- Both 0001 triggers fire: a new auth user gets a profile; a new order gets its
  `submitted` event.
- **The 0002 staff-workflow triggers do what they claim.** Walking an order
  draft → in progress → pending review → completed writes four history rows with
  the mock's exact wording and three notifications with the mock's exact titles;
  filling `deliverable` adds one `delivered` event; re-editing an already-set
  `deliverable` adds no second one; rewriting a status with the value it already
  has adds nothing at all. A cancelled order reads "Order cancelled".
- The new triggers open no hole: as `authenticated`, forging a notification,
  writing your own history and advancing your own order are all still
  `permission denied`. The history is written *for* the client, never *by* them.
- `seed_hosted.sql` produces the same 13 / 9 / 53 / 5-with-2-unread shape as the
  mock, takes its order numbers from the live sequence rather than hardcoding
  them, and refuses with a readable message both for an unknown email and for an
  account that already has orders. It was also run **as a single multi-statement
  batch**, which is how the Supabase SQL editor submits it, rather than
  statement-by-statement the way `psql -f` does — the temporary tables survive
  that, and the earlier `\set` version did not. The cleanup block at the bottom
  was run too: it leaves orders, events and notifications all at zero, and the
  seed then runs clean a second time.
- A new order inserted as `authenticated` comes out `draft` with a sequence
  number, regardless of what the client asked for.
- **Every RLS claim above was tested by impersonating users at the SQL level.**
  A second user sees zero orders and zero events. The owner cannot mark their own
  order completed, delete it, insert one already completed, create one on another
  account, rewrite a notification title, write their own history, or change their
  profile email. A signed-out caller sees nothing.
- 84 unit tests pass; typecheck clean.

One test had to be moved rather than fixed. `seed.spec.ts` asserted that the
seeded deliveries left at least one empty month in the seven-month chart window,
so the design would have to cope with a zero bar. The seed places deliveries in
days-ago offsets, so which calendar months they fall in drifts with the date the
suite runs on, and on 19 Sep 2026 all nine spread across all seven buckets and
the assertion failed. Nothing was broken. The requirement is real, but it
belongs to `completionsByMonth`, which is pure and takes an injectable `now`, so
it is now pinned and asserted there. A test that passes or fails on the calendar
is not testing the code.

**A hosted project now has the schema.** `supabase db push` applied `0001` to a
real hosted project cleanly, storage policy included.

**The round trip is verified.** `DATA_SOURCE=supabase` against a hosted project,
banner gone, signed in through real GoTrue, dashboard rendering the empty states
off an empty Postgres. All four tables and their foreign keys are live. This was
the open claim from Phase 0 onward and it is now closed.

Worth recording how it *first* went wrong, because the failure is convincing:
an earlier attempt looked like a successful Supabase sign-in — sign-up worked,
a wrong password was rejected — but the demo-mode banner was on screen and the
dashboard showed the thirteen fixture orders. That was the mock provider doing
exactly what it is supposed to do. **The banner is the only reliable tell.**
Auth behaving correctly proves nothing about which provider is behind it, since
both implement the same contract; that is the entire point of the abstraction
and also the reason it can fool you.

Still unproven on hosted: **the 0002 staff triggers** (verified against Postgres
16 locally, never watched on a real project) and **anything to do with orders**,
since no order has been created there yet.

**Order-notification email is written but has never run.** The Edge Function in
`supabase/functions/send-notification-email/` was authored in a container with
no Deno and no Supabase project, so it has not been deployed, invoked, or seen
to deliver anything. Treat every claim in it as untested until someone watches
an email arrive. See **Email** below for the setup, and the walk-through it
ends with for proving it works.

**Still no auth email and no password-reset flow** — no "forgot password" link
on the login page, no route behind it, no `resetPassword` on `DataProvider`.
Supabase's built-in sender handles confirmations only, and is rate-limited to a
handful an hour. `weeklySummary` is a toggle with nothing behind it either: it
needs a scheduled job, not a row trigger, and none exists.

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

## Email

One rule: **`notifications` is the single source of truth, and email is a
subscriber to it.** Migration `0002` writes exactly one row per thing worth
telling a client, so a Database Webhook on that table's INSERT gets email for
free and there is never a second definition of "worth an interruption" to keep
in sync with the first. One row, two destinations: the in-app inbox and the
real one.

Email is sent from a webhook rather than from inside the trigger on purpose.
Emailing from the trigger would put an HTTP round trip inside the transaction
that changes an order's status, so a slow provider would slow the table editor
down and a failing one would roll the status change back. An order that did not
advance because an email bounced is a worse bug than an email that never
arrived.

### Setting it up

```bash
npx supabase secrets set RESEND_API_KEY=re_...
npx supabase secrets set NOTIFY_WEBHOOK_SECRET=<long random string>
npx supabase secrets set APP_URL=http://localhost:3000
npx supabase secrets set EMAIL_FROM="Article Orders <onboarding@resend.dev>"
npx supabase functions deploy send-notification-email
```

Then Dashboard → Database → Webhooks → new webhook on `notifications`, **INSERT
only**, HTTP POST at the deployed function, with an `x-webhook-secret` header
carrying the same string. Without that header check the function is an open
relay for anyone who learns its URL.

Two things that will bite otherwise:

- **`onboarding@resend.dev` only delivers to the address on the Resend
  account.** Mail to anyone else is accepted and silently dropped. Real clients
  need a verified domain.
- **Seed before you wire the webhook up**, or you will email yourself about
  orders that "happened" months ago. The function skips rows whose `created_at`
  is more than five minutes old for exactly this reason, but ordering it the
  easy way costs nothing.

`system` notifications are deliberately never emailed — "Welcome to Article
Orders" belongs in the inbox, not someone's mail. `order_update` is gated on
`preferences.notifications.statusChange` and `order_complete` on `delivered`,
which is where those Settings toggles finally start meaning something.

### Proving it works

Change one order's `status` in the table editor and watch three things happen:
the detail page timeline gains a row, the Inbox badge increments, and the email
arrives. If the first two happen and the third does not, it is the webhook or
the function — check Dashboard → Edge Functions → Logs, which is where the
`skipped:` reasons show up.

---

## What's next

1. **Confirm the Supabase round trip** with the banner gone (above). Everything
   else on this list assumes it.

2. **Deploy and prove the notification email** (see **Email** above). It is
   written and committed; nobody has watched it send anything.

3. **A verified sending domain**, whenever real clients are in play. Until then
   the test sender only reaches your own address, which makes the whole feature
   untestable against anyone else.

4. **Password reset.** The gap most likely to produce a support request: a user
   who forgets their password currently has no route back in. Needs a link on
   the login page, a reset route, `resetPassword` on both providers, and custom
   SMTP under Authentication → Emails.

5. Deploy to Netlify when there is something worth looking at.

6. Longer term, if `draft` orders ever need a real client-initiated action
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
