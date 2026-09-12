# 03 — Data, limits and real content

Everything here is lifted from the code. Field names, limits and error strings are exact, so
anything you put in a mockup can be the real thing.

---

## Statuses

Five flat badges. **No progress bars, no percentages** — the reference uses a badge and so does the
data model. Fewer states also means less for staff to keep accurate by hand.

| Status | Badge | Terminal | Order-content panel says |
|---|---|---|---|
| `draft` | Draft | no | "This order is still a draft" / not submitted yet, no writer has picked it up |
| `in_progress` | In progress | no | "Content is being written" / your writer is working on this piece, you'll be notified when it's ready for review |
| `pending_review` | Pending review | no | "Ready for your review" / the draft is finished and waiting for you |
| `completed` | Completed | yes | "This order is complete" / the finished piece is available to download |
| `cancelled` | Cancelled | yes | "This order was cancelled" / no further work will happen |

- **Every new order starts as `draft`.** Enforced in the database; a client cannot create an order
  in any other status.
- **`cancelled` is not an error.** It is a normal terminal state.
- **Clients cannot change a status.** There is no control for it anywhere.

---

## Fields on an order

| Field | Type | Notes |
|---|---|---|
| `orderNumber` | integer | Shown as "Order #1024". From a database sequence, never reused |
| `title` | text | 3–120 characters |
| `brief` | text | 10–5000 characters |
| `keywords` | text[] | 0–10, lowercased, de-duplicated. Entered as one comma-separated field |
| `format` | enum | Blog post · Whitepaper · Case study · Newsletter · Landing page |
| `wordCount` | integer | 100–10000 |
| `deadline` | date or null | `YYYY-MM-DD`; optional — an empty input stores null |
| `status` | enum | The five above. Staff-set |
| `priority` | enum | Low · Medium · High. **Staff-set, client-readable.** Defaults to Medium |
| `assignees` | array | `{ name, avatarUrl }`. May be empty. Staff-set |
| `deliverable` | object or null | `{ filename, url, uploadedAt }`. Null until the work is delivered |
| `createdAt` / `updatedAt` | timestamp | System-managed |

**On avatars:** `avatarUrl` is null throughout the fixtures, so the design needs an initials
fallback. Do not assume a photo is always there.

**On priority:** it is deliberately not client-editable. If clients could set it, every order would
be High. It tells the client how the work has been triaged; it is not a queue-jump control.

## Fields on the profile

`email` (read-only in the UI) · `fullName` · `company` · `avatarUrl` · notification toggles
(status change, delivered, weekly summary) · order defaults (word count, format, tone). All the
optional ones may be null.

Password: minimum 8 characters, with a confirmation that must match.

---

## Order history

Every order has an append-only list of events, newest first. This is what the detail-page timeline
renders, and it carries **real timestamps**:

- `submitted` — "Order submitted"
- `status_changed` — "Status changed to in progress"
- `delivered` — "Delivered Customer_Success_Story_Final.docx"
- `cancelled` — "Order cancelled"

A draft has exactly one event. A completed order has four or five. The fixtures in
`order-events.json` are generated from each order's status, so a timeline can never contradict its
badge — and your artboards shouldn't either.

---

## The dashboard

### Stat counts
Total · Draft · In progress · Pending review · Completed · Cancelled · Overdue · Next deadline.

*Overdue* means the deadline has passed **and** the order is not finished. A completed order past
its deadline is not overdue — nobody is waiting on it.

### The completion chart

Completions per calendar month for the last seven months, oldest first, **including months with
none**.

The real series, from `fixtures/dashboard.json`:

```
Mar 1   Apr 2   May 1   Jun 1   Jul 2   Aug 2   Sep 0
```

That is the honest scale. One client of a writing agency finishes one to three pieces a month and
has quiet months. A chart designed against hundreds looks impressive in a screenshot and then breaks
the first time it meets a real account — so please design the axis, the labels and the empty month
for these numbers.

The September zero is not a bug. It is the current month, partly elapsed. The design has to survive
a trailing zero without looking broken.

---

## Notifications

`{ kind, title, orderId, createdAt, readAt }` where kind is `order_update`, `order_complete` or
`system`. `readAt` null means unread.

Real examples from the fixtures:
- "Your order 'SaaS Growth Guide' is now in progress" — unread
- "Order 'Q3 newsletter' is ready for your review" — unread
- "Order 'Integrations launch announcement' marked as complete" — read
- "Welcome to Article Orders" — read

Two of five are unread, so the nav needs an unread indicator and the list needs a read/unread
distinction. The only action is **Mark all as read**.

---

## Real error messages

Use these verbatim in error-state artboards.

**Form validation**
- `Enter a valid email address`
- `Password must be at least 8 characters`
- `Passwords do not match`
- `Give the article a title of at least 3 characters`
- `Title must be 120 characters or fewer`
- `Tell us a little more about what you need (10 characters minimum)`
- `Brief must be 5000 characters or fewer`
- `Choose a format`
- `Enter a word count`
- `Word count must be a whole number`
- `Minimum order is 100 words`
- `For more than 10,000 words, please contact us directly`
- `Use 10 keywords or fewer`
- `Each keyword must be 60 characters or fewer`
- `Enter a valid date`
- `Enter a valid URL`

**Whole-form and auth**
- `Check the details below` — above a form when one or more fields failed
- `Email or password is incorrect` — sign-in failure. Deliberately vague, and the same whether or
  not the email exists. Do not split it into "no such account" / "wrong password"
- `An account with that email already exists`
- `You need to be signed in to do that`

---

## List controls

**Sort** — newest first (default) · oldest first · deadline soonest · deadline latest · title A–Z.
Orders with no deadline sort **last in both deadline directions**: "whenever you can" is neither the
most nor the least urgent thing, it is simply not on the schedule.

**Filter** — by status, multi-select, any combination of the five.

**Search** — free text against title and brief.

**Pagination** — 10 per page. The total is always known, so "showing 1–10 of 13" is available.

---

## The sample records

| File | What it holds |
|---|---|
| `orders.json` | 13 orders over 7 months: 9 completed, 1 in progress, 1 pending review, 1 draft, 1 cancelled |
| `order-events.json` | 53 timeline entries for those orders |
| `notifications.json` | 5 items, the 2 newest unread |
| `dashboard.json` | The exact counts and chart series the app computes from the above |
| `profile.json` | A client with a name, company and non-default preferences |
| `edge-cases.json` | 11 records that break layouts |

These are the same records the running app shows in demo mode. Please use them.

### Edge cases worth drawing

| id | What it tests |
|---|---|
| `edge-max-title` | Title at exactly 120 characters |
| `edge-min-title` | Title at 3 characters |
| `edge-overdue` | Deadline passed, still in flight — none of the 13 samples is overdue |
| `edge-no-deadline` | Null deadline |
| `edge-cancelled` | The cancelled treatment |
| `edge-max-words` / `edge-min-words` | 10,000 and 100 — the widest and narrowest numbers |
| `edge-long-brief` | A brief that dominates the detail page |
| `edge-max-keywords` | Ten keywords that have to wrap |
| `edge-many-assignees` | Four writers — the avatar stack needs an overflow rule |
| `edge-long-filename` | A deliverable filename long enough to need truncating |

---

## What the data cannot support

Short list, but worth checking before you design a panel around one of these:

- **Writer profiles.** An assignee is a name and an optional avatar. No bio, no workload, no
  contact route, nothing to click through to.
- **Anything per-status duration.** Events carry timestamps, so "when did it enter review" is
  answerable, but there is no stored cycle time, on-time rate or SLA.
- **Client uploads.** Files move one way: staff upload, client downloads. There is no attachment on
  a brief.
- **Revisions or drafts.** One deliverable per order, replaced in place. No version history.
- **Messaging.** No comments, no thread, no reply-to-writer.
- **Anything financial.** No price, plan, invoice or spend.

If a screen wants one of these, say so — several are cheap to add.
