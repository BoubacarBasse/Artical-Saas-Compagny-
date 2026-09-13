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
| 1 — build the signed-in UI | **Not started. This is the next job.** |
| Deploy to Netlify | Deferred by choice. `netlify.toml` and the plugin are already in place. |

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

1. **Confirm the Supabase round trip** on a machine with Docker (above).
2. **Phase 1 — build the signed-in UI** against the canvas. Every page under
   `src/app/` is a placeholder waiting to be replaced. Start with the shell and
   the token layer in `src/app/globals.css`, then My Tasks, dashboard, detail.
3. Deploy to Netlify when there is something worth looking at.

---

## Conventions

- Do not reintroduce progress percentages or a dark mode without deciding to.
- Keep the mock and Supabase providers behaviourally identical. When they drift,
  a user-visible difference between `npm run dev` and `npm run dev:supabase` is
  the symptom, and the `DataProvider` contract is where the fix goes.
- Error strings are worded identically in both providers on purpose, so one test
  can assert against both.
- `npm run typecheck && npm run test:unit` before committing.
