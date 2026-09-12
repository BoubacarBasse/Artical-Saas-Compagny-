# 02 — Screens and states

Every artboard needed, grouped. Each row is a **separate artboard**, not a variation to be implied.

Priority: **P1** signed-in core · **P2** settings and auth · **P3** landing page, a later phase.

The "must show" notes describe *what information is present*, never how it looks. Layout, hierarchy
and emphasis are yours.

> Read `03-data-and-content.md` first.

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
| `F1` | Status badge, all five | Draft · In progress · Pending review · Completed · Cancelled |
| `F2` | Priority indicator | Low · Medium · High. Read-only — it is not a control |
| `F3` | Assignee avatars | One, two, and four writers. `avatarUrl` is null in all fixtures, so **initials fallback is the default case**, not the exception. Four needs an overflow rule |
| `F4` | Buttons | Primary, secondary, destructive × default, hover, focus, disabled, loading |
| `F5` | Form fields | Text, long text, number, date, select, checkbox/toggle × default, focus, filled, error, disabled |
| `F6` | Keyword input | One comma-separated field that becomes chips. Empty, three keywords, and ten (the maximum) |
| `F7` | Character counter | `title` (120) and `brief` (5000). Include near-limit and over-limit |
| `F8` | Empty-state pattern | The three kinds are genuinely different — see section C |
| `F9` | Demo-mode banner | Persistent notice when the app runs on demo data rather than a real database |

---

## B. App shell — P1

| id | Artboard | Must show |
|---|---|---|
| `S1` | Shell, desktop | Sidebar: Dashboard · My Tasks · Inbox, with the current page marked. Global search in the header. Notification bell with unread indicator. Avatar, top right |
| `S2` | Avatar menu open | **This is where Settings lives**, with sign out. There is no Settings item in the sidebar |
| `S3` | Inbox nav, unread | How the sidebar and the bell show that two notifications are unread |
| `S4` | Shell, mobile | Same navigation, collapsed |
| `S5` | Mobile nav open | — |
| `S6` | Shell with demo banner | `F9` in place, coexisting with the nav |

---

## C. My Tasks — P1

**The most design-heavy screen.** Search, status filter, sort, pagination, and four states that are
not the same screen.

| id | Artboard | Must show |
|---|---|---|
| `O1` | Populated, default | Newest first. Title, status, assignees, deadline. Thirteen orders means two pages at ten per page |
| `O2` | Filtered, with results | Active filters visible and clearable; the count reflects the filter |
| `O3` | **Filtered to nothing** | The user has orders, none match. Offer: clear the filter |
| `O4` | **No orders at all** | First run. Never ordered. Offer: create the first order |
| `O5` | Loading | — |
| `O6` | Error | Loading failed. Offer: retry |
| `O7` | Page 2 of 2 | Pagination in a non-first state. "Showing 11–13 of 13" is available |
| `O8` | Search active, with results | Query visible and clearable |
| `O9` | Mobile, populated | A table at 390px is the hardest thing in this brief |
| `O10` | Mobile, filter/sort open | However these are reached on a small screen |

**`O3` and `O4` are different screens.** One means "your filter is too narrow" and its action is
*clear the filter*. The other means "you have never ordered anything" and its action is *order
something*. Showing the same illustration and the same "No orders found" for both is the single most
common mistake in a table design, and it makes the first-run experience feel broken.

Use records from `edge-cases.json` in at least one list artboard — a 120-character title, a null
deadline, an overdue order and a four-writer stack in one table is where a row layout gets tested.

---

## D. Dashboard — P1

The landing spot after sign-in. A returning client is asking: **is my thing ready yet?**

| id | Artboard | Must show |
|---|---|---|
| `D1` | Populated | Stat row · the completion chart · recent orders · a route to order something new |
| `D2` | Chart detail | The chart on its own, with a hover/tooltip state. Series: `Mar 1 · Apr 2 · May 1 · Jun 1 · Jul 2 · Aug 2 · Sep 0` |
| `D3` | First run, zero orders | Never ordered. Stats all zero and **a chart with no data at all** — this needs a deliberate treatment, not an empty grid |
| `D4` | Loading | — |
| `D5` | Error | — |
| `D6` | Mobile, populated | The chart at 390px |

Available counts: total · per status · overdue · next deadline. See `03-data-and-content.md` for the
handful of things that are not derivable.

**On the chart, again:** one to three completions a month, with a zero in the series. Design for
that, not for a smooth curve in the hundreds. `D3` matters — a brand-new client sees a chart with
nothing in it, and "no data yet" is a real state here, not an edge case.

---

## E. Order detail — P1

Layout in the reference: order content on the left, details panel and timeline on the right,
breadcrumb and status badge at the top.

| id | Artboard | Must show |
|---|---|---|
| `R1` | In progress | Breadcrumb "Orders › Order #1024", title, status badge. Content panel: "Content is being written". Original brief with keywords. Details: format, word count, deadline, priority. Timeline |
| `R2` | Completed | Content panel becomes the deliverable: filename, upload date, Download. Timeline includes the delivery |
| `R3` | Draft | Not submitted. Timeline has exactly one entry |
| `R4` | Pending review | Ready for the client to read |
| `R5` | Cancelled | Terminal. Not an error |
| `R6` | Overdue, in flight | Deadline passed, work continuing. Use `edge-overdue` |
| `R7` | Long brief | Use `edge-long-brief`. Must stay readable without burying the status or details |
| `R8` | Ten keywords | Use `edge-max-keywords`. They have to wrap |
| `R9` | Long filename | Use `edge-long-filename`. Truncation without losing the extension |
| `R10` | Loading | — |
| `R11` | Not found | Also what a client sees pasting someone else's order id. Must not reveal whether it exists |
| `R12` | Mobile, in progress | Where the details panel and timeline go when there is no second column |

The timeline carries **real dates** — "Status changed to in progress · Oct 16" — so design it as a
dated history, not as a progress tracker.

---

## F. Inbox — P1

| id | Artboard | Must show |
|---|---|---|
| `I1` | Populated | Five notifications, the two newest unread. Per-item icon by kind, title, date. "Mark all as read" |
| `I2` | All read | After the action. The unread affordance is gone |
| `I3` | Empty | A new account with nothing but the welcome item, or none at all |
| `I4` | Loading | — |
| `I5` | Mobile | — |

The only action on this screen is *mark all as read*. Individual items link to their order where
there is one; the `system` welcome item does not.

---

## G. New order — P1

Fields: title, brief, keywords, format, word count, deadline (optional).

| id | Artboard | Must show |
|---|---|---|
| `N1` | Empty | — |
| `N2` | Empty, defaults pre-filled | A repeat client with saved defaults for word count, format and tone. Make clear they are pre-filled, not fixed |
| `N3` | Filled | Realistic content, not lorem ipsum |
| `N4` | Validation errors | Several at once, real strings, with `Check the details below` above the form |
| `N5` | Submitting | — |
| `N6` | Mobile | — |

A new order always starts as **Draft**. There is no status picker, no priority picker, no writer
picker, no attachment. Those are all staff fields.

---

## H. Settings — P2

Reached from the avatar menu, not the sidebar. Four areas: profile · notifications · order defaults ·
password. One page or several is your call.

| id | Artboard | Must show |
|---|---|---|
| `T1` | Settings overview | How the four areas are organised, and how you got here from the avatar |
| `T2` | Profile | Name, company, avatar URL. Email shown but not editable |
| `T3` | Profile, saved | Confirmation that a change was saved |
| `T4` | Notifications | Three toggles: status change, delivered, weekly summary |
| `T5` | Order defaults | Default word count, format and tone — all optional, all pre-fill the order form |
| `T6` | Password | New password and confirmation |
| `T7` | Password, error | `Passwords do not match` |
| `T8` | Saving | — |
| `T9` | Mobile | — |

No appearance section — light mode only. Account deletion is not in v1.

---

## I. Authentication — P2

| id | Artboard | Must show |
|---|---|---|
| `U1` | Sign up | Email, password |
| `U2` | Sign up, validation errors | Real strings |
| `U3` | Sign up, email taken | `An account with that email already exists` |
| `U4` | Sign up, submitting | — |
| `U5` | Log in | — |
| `U6` | Log in, failed | `Email or password is incorrect`. One message regardless of which was wrong |
| `U7` | Log in, arrived by redirect | Tried a protected page while signed out. Must not read as an error |
| `U8` | Log in, submitting | — |
| `U9` | Mobile, both | — |

No password reset by email, no social sign-in, no email verification screen in v1.

---

## J. System — P2

| id | Artboard | Must show |
|---|---|---|
| `Y1` | 404 | A route that does not exist. Distinct from `R11`, a real route with no visible record |
| `Y2` | Global search | The header search with results. `⌘1` opens it in the reference |

---

## K. Landing page — P3

Public, signed-out. Lower priority. Do it only once the signed-in screens are done.

| id | Artboard |
|---|---|
| `L1` | Landing, desktop |
| `L2` | Landing, mobile |

It has to explain the service and route to sign up and log in. No pricing table, testimonials or
blog — none of that content exists. If the page clearly needs them, say so; that is a content
decision for the business.

---

## Summary

| Group | Artboards | Priority |
|---|---|---|
| A Foundations | 9 | P1 |
| B App shell | 6 | P1 |
| C My Tasks | 10 | P1 |
| D Dashboard | 6 | P1 |
| E Order detail | 12 | P1 |
| F Inbox | 5 | P1 |
| G New order | 6 | P1 |
| H Settings | 9 | P2 |
| I Authentication | 9 | P2 |
| J System | 2 | P2 |
| K Landing | 2 | P3 |
| **Total** | **76** | |

If 76 is too many to be useful, the honest minimum that unblocks the build is **A + B + C + D + E**
— foundations, shell, the task table, the dashboard and the order detail, each with all their
states. Inbox, new order, settings and auth can follow the patterns those establish.
