# 02 — Screens and states

Every artboard needed, grouped. Each row is a **separate artboard**, not a variation to be implied.

Priority: **P1** signed-in core, do these first · **P2** settings and auth · **P3** landing page,
a later phase.

The "must show" notes describe *what information is present*, never how it looks. Layout,
hierarchy and emphasis are yours.

> Read `03-data-and-content.md` first — particularly *What the data can and cannot support*.

---

## Responsive requirement

Every screen must hold at **~390px** and at **desktop**. The middle is your call. Mobile artboards
are listed only where the layout genuinely has to change; if a screen reflows without a real
decision, one artboard is fine — say so rather than drawing it twice.

---

## A. Foundations — P1

The pieces every screen reuses. Worth doing before the screens themselves.

| id | Artboard | Must show |
|---|---|---|
| `F1` | Stage badge, all six | One per stage: Brief received, Writing, Editing, Final review, Delivered, Cancelled |
| `F2` | Progress indicator, all six | 10 / 40 / 65 / 85 / 100 / 0 %. Must read as done / current / upcoming — **no dates** |
| `F3` | Buttons | Primary, secondary, destructive × default, hover, focus, disabled, loading |
| `F4` | Form fields | Text, long text, number, date, select, checkbox/toggle × default, focus, filled, error, disabled |
| `F5` | Character counter | `title` (120 cap) and `brief` (5000 cap) need one. Include the near-limit and over-limit appearance |
| `F6` | Empty-state pattern | The three kinds are genuinely different — see section C |
| `F7` | Demo-mode banner | Persistent notice shown when the app runs on demo data rather than a real database |

`cancelled` deserves attention in `F1`/`F2`: it is terminal and sits **outside** the pipeline at 0%,
not stuck partway along it. It is not an error.

---

## B. App shell — P1

| id | Artboard | Must show |
|---|---|---|
| `S1` | Shell, desktop | Nav (Dashboard · Orders · Settings), current-page indication, the user's name or email, route to sign out |
| `S2` | User menu open | Sign out. Anything else here is your call — there is little to put in it |
| `S3` | Shell, mobile | Same navigation, collapsed |
| `S4` | Mobile nav open | — |
| `S5` | Shell with demo banner | `F7` in place, showing how it coexists with the nav |

---

## C. Orders list — P1

**The most design-heavy screen.** Search, stage filter, sort, pagination, and four states that are
not the same screen.

| id | Artboard | Must show |
|---|---|---|
| `O1` | Populated, default | Newest first, page 1 of several. Title, stage, progress, deadline, word count, created date |
| `O2` | Filtered, with results | Active filters visible and clearable; the result count reflects the filter |
| `O3` | **Filtered to nothing** | The user has orders, but none match. Offer: clear the filter |
| `O4` | **No orders at all** | First-run. The user has never ordered. Offer: create the first order |
| `O5` | Loading | — |
| `O6` | Error | Loading the list failed. Offer: retry |
| `O7` | Page 2 of N | Pagination in a non-first state. "Showing 11–20 of 34" is available |
| `O8` | Search active, with results | Query visible and clearable |
| `O9` | Mobile, populated | A table at 390px is the hardest thing in this brief |
| `O10` | Mobile, filter/sort open | However these are reached on a small screen |

**`O3` and `O4` are different screens.** One means "your filter is too narrow" and its action is
*clear the filter*. The other means "you have never ordered anything" and its action is *order
something*. Showing the same illustration and the same "No orders found" for both is the single
most common mistake in a table design, and it makes the first-run experience feel broken.

Use `fixtures/edge-cases.json` in at least one list artboard — a 120-character title, a null
deadline and an overdue order in the same table is where a row layout actually gets tested.

---

## D. Dashboard — P1

The landing spot after sign-in. A returning client is asking one question: **is my thing ready
yet?** They should get the answer without reading.

| id | Artboard | Must show |
|---|---|---|
| `D1` | Populated | In-flight orders with their progress · next upcoming deadline · anything overdue · a route to order something new |
| `D2` | First run, zero orders | Never ordered. The whole screen is an invitation to order |
| `D3` | Loading | — |
| `D4` | Error | — |
| `D5` | Mobile, populated | — |

Derivable figures, if you want summary tiles: total orders · count per stage · in-flight vs
finished · next deadline · overdue count · words delivered. **Not** available: turnaround time,
on-time rate, any trend. See `03-data-and-content.md`.

---

## E. Order detail — P1

| id | Artboard | Must show |
|---|---|---|
| `R1` | In flight, mid-pipeline | Title, full brief, word count, deadline, current stage with its description, progress through the pipeline |
| `R2` | Delivered | Terminal at 100%. Note there is no file to download — delivery happens outside the app |
| `R3` | Cancelled | Terminal, outside the pipeline, 0%. Not an error |
| `R4` | Overdue, in flight | Deadline passed, work continuing. Use `edge-overdue` |
| `R5` | Long brief | Use `edge-long-brief`. The brief must stay readable without burying the stage |
| `R6` | Loading | — |
| `R7` | Not found | Also what a client sees if they paste someone else's order id. It must not reveal whether that order exists |
| `R8` | Mobile, in flight | — |

The stage display shows **done / current / upcoming** and the description for the current stage.
It cannot show when any transition happened.

---

## F. New order — P1

Fields: title, brief, word count, deadline (optional). That is all.

| id | Artboard | Must show |
|---|---|---|
| `N1` | Empty | — |
| `N2` | Empty, defaults pre-filled | A repeat client with saved order defaults. Make clear these are pre-filled, not fixed |
| `N3` | Filled | Realistic content, not lorem ipsum |
| `N4` | Validation errors | Several at once, using the real strings from `03-data-and-content.md`, with `Check the details below` above the form |
| `N5` | Submitting | — |
| `N6` | Mobile | — |

A new order always begins at **Brief received**. There is no stage picker, no priority, no rush
option, no attachment.

---

## G. Settings — P2

Four areas: profile · notifications · order defaults · password. Whether they are one page or
several is your call.

| id | Artboard | Must show |
|---|---|---|
| `T1` | Settings overview | How the four areas are organised |
| `T2` | Profile | Name, company, avatar URL. Email is shown but not editable |
| `T3` | Profile, saved | Confirmation that a change was saved |
| `T4` | Notifications | Three toggles: status change, delivered, weekly summary |
| `T5` | Order defaults | Default word count, tone, audience — all optional, all pre-fill the order form |
| `T6` | Password | New password and confirmation |
| `T7` | Password, error | `Passwords do not match` |
| `T8` | Saving | — |
| `T9` | Mobile | — |

There is **no appearance section** — light mode only. Account deletion is not in v1.

---

## H. Authentication — P2

| id | Artboard | Must show |
|---|---|---|
| `U1` | Sign up | Email, password |
| `U2` | Sign up, validation errors | Real strings |
| `U3` | Sign up, email taken | `An account with that email already exists` |
| `U4` | Sign up, submitting | — |
| `U5` | Log in | — |
| `U6` | Log in, failed | `Email or password is incorrect`. One message regardless of which was wrong — do not split it |
| `U7` | Log in, arrived by redirect | The user tried to open a protected page while signed out and was sent here. They need to understand why without it reading as an error |
| `U8` | Log in, submitting | — |
| `U9` | Mobile, both | — |

There is no password reset by email, no social sign-in, no email verification screen in v1.

---

## I. System — P2

| id | Artboard | Must show |
|---|---|---|
| `Y1` | 404 | A route that does not exist. Distinct from `R7`, which is a real route with no visible record |

---

## J. Landing page — P3

Public, signed-out. Lower priority — a later phase. Do it only once the signed-in screens are done.

| id | Artboard |
|---|---|
| `L1` | Landing, desktop |
| `L2` | Landing, mobile |

What it has to do: explain the service, and route to sign up and log in. There is no pricing table,
no testimonials and no blog to design, because none of that content exists yet. If the page clearly
needs them, say so — that is a content decision for the business.

---

## Summary

| Group | Artboards | Priority |
|---|---|---|
| A Foundations | 7 | P1 |
| B App shell | 5 | P1 |
| C Orders list | 10 | P1 |
| D Dashboard | 5 | P1 |
| E Order detail | 8 | P1 |
| F New order | 6 | P1 |
| G Settings | 9 | P2 |
| H Authentication | 9 | P2 |
| I System | 1 | P2 |
| J Landing | 2 | P3 |
| **Total** | **62** | |

If 62 is too many to be useful, the honest minimum that unblocks the build is **A + C + D + E + F**
— foundations plus the four signed-in screens with all their states. Settings and auth can follow
the patterns those establish.
