# Article Orders — client dashboard

A client-facing SaaS dashboard for a content-writing business. Clients sign up,
order articles, and follow them through a production pipeline.

**Next.js 15 · Tailwind CSS v4 · Supabase · Netlify**

---

## Status: Phase 0 of 6

The visual design is defined by screenshots that have not arrived yet, so this
repository currently contains **only the parts with no design surface**. Every
route file under `src/app` is a labelled placeholder and gets replaced wholesale
in Phase 1.

| # | Phase | State |
|---|---|---|
| 0 | Design-independent substrate | **done** |
| 1 | Signed-in pages, styled from screenshots | waiting on screenshots |
| 2 | Interactivity, mock data wired, routes proven | not started |
| 3 | Auth + DB on Supabase | provider and migration written, not yet applied |
| 4 | Landing page | not started |
| 5 | E2E: auth, middleware, security | pure-logic suite done; browser suite pending |
| 6 | Deploy to Netlify | deferred by request |

---

## Running it

```bash
npm install
cp .env.example .env.local     # defaults are fine: DATA_SOURCE=mock
npm run dev
```

No database is needed in mock mode.

```bash
npm run typecheck     # tsc, no emit
npm test              # Playwright (unit project — no browser required)
npm run build         # production build
```

> **TypeScript is pinned to 5.x on purpose.** TypeScript 7 ships a rewritten
> compiler API that Next 15.5's config loader cannot read — it fails with
> `Cannot read properties of undefined (reading 'fileExists')`. Do not bump it
> until Next supports TS 7.

---

## Architecture: one interface, two backends

The brief called for swapping demo data to a real database by "flipping a single
switch". The way that usually gets built — an `if (USE_MOCK)` in every page —
leaks the decision everywhere and quietly changes behaviour at the swap.

Instead there is **one interface with two implementations and a single factory**:

```
src/lib/data/
  types.ts              the DataProvider contract
  schemas.ts            Zod validation at the app boundary
  index.ts              <- THE SWAP POINT. one ternary. nothing else names a provider.
  mock/                 cookie-backed demo data
  supabase/             real Postgres + Auth
```

```ts
// src/lib/data/index.ts
export const data: DataProvider =
  process.env.DATA_SOURCE === "supabase" ? supabaseProvider : mockProvider;
```

Pages import `data` and never reference Supabase. If flipping `DATA_SOURCE` ever
requires editing a page, the abstraction has sprung a leak — fix the leak, not
the page.

Three properties of the interface are deliberate:

- **No method takes a `userId`.** Each provider resolves the caller itself, so a
  page cannot ask for someone else's data even by accident.
- **`listOrders` takes a query.** Search, filtering, sorting and pagination are
  pushed into the provider. If the mock returned everything and the page filtered
  in memory, behaviour would change the moment we swapped to Postgres.
- **Auth lives in the interface too**, so the whole sign-up and permission
  surface is exercisable with no database attached.

### Why the mock data lives in a cookie

Not convenience. The security suite has to prove *user A cannot see user B's
order*, which needs two independent users at once — two browser contexts. A
module-level array is shared process state: both contexts would resolve to one
identity and the test could not be written honestly. A signed, httpOnly cookie
gives real separation with no database.

Mock mode is a **demo fixture, not a security boundary**. The signature only
stops the payload being hand-edited in devtools.

---

## Supabase

Apply `supabase/migrations/0001_init.sql` in the Supabase SQL editor, then set
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`DATA_SOURCE=supabase`.

Supabase enables **Confirm email** by default, so a new account has no session
until the link is clicked and v1 has no confirmation UI. Turn it off under
*Authentication → Providers → Email* while developing.

### How staff advance an order

There is no admin UI in v1. Staff open *Table Editor → `orders`* and change the
`stage` cell. Nothing else needs touching: the client's progress percentage is
derived from `stage` in `src/lib/orders/stages.ts`, so there is no second column
to keep in sync.

### Two RLS policies that are easy to get wrong

The brief's "staff edit the status by hand" shortcut opens two holes. Both are
closed in the migration:

1. **`orders` has no client `UPDATE` or `DELETE` policy.** The reflexive
   `for all using (auth.uid() = user_id)` would let a client mark their own order
   *Delivered* and walk off with free work. Staff use the dashboard's
   service_role connection, which bypasses RLS, so they are unaffected.

2. **The `INSERT` policy pins the starting stage:**
   `with check (auth.uid() = user_id and stage = 'brief_received')`.
   Without that second clause, locking down `UPDATE` buys nothing — a client
   simply creates an order that is already marked delivered.

`profiles` additionally uses **column-level grants**, because a row policy says
which *rows* you may update, not which *columns*. Without them a client could
rewrite the `email` mirror on their own row.

---

## Repository map

| Path | What it is |
|---|---|
| `src/lib/data/index.ts` | The swap point |
| `src/lib/data/types.ts` | The contract both providers satisfy |
| `src/lib/data/mock/query.ts` | Filter/sort/paginate — pure, so its semantics are testable |
| `src/lib/data/mock/state.ts` | Signed-cookie codec (Edge-safe: Web Crypto, not `node:crypto`) |
| `src/lib/orders/stages.ts` | Pipeline stages and derived progress |
| `src/lib/supabase/` | `@supabase/ssr` clients for server, browser and middleware |
| `src/middleware.ts` | Route guard + Supabase session refresh |
| `src/app/globals.css` | Design token layer — where the screenshots land |
| `supabase/migrations/` | Schema and RLS |
| `tests/unit/` | Pure-logic suite (57 tests) |

Middleware is a redirect, not a security boundary. It stops a signed-out visitor
seeing a dashboard shell; RLS is what stops anyone reading data that is not
theirs. Both exist, and they are not substitutes.
