# 03 — Data, limits and real content

Everything here is lifted from the code. Field names, limits and error strings are exact, so
anything you put in a mockup can be the real thing.

---

## What the data can and cannot support

**Read this before designing the dashboard or the order detail page.**

An order stores its **current stage and nothing about how it got there.** There is no history
table, no per-stage timestamp, no record of when it moved. Two natural designs are therefore not
buildable:

- ❌ **A timeline with a date beside each stage.** "Brief received — 2 Sep · Writing — 5 Sep · …"
  We cannot fill those dates in. Stages can be shown as **done / current / upcoming**, which is
  fully supported — just not *when* each transition happened.
- ❌ **Anything averaging or trending over time.** Turnaround time, on-time rate, "faster than last
  month", a chart of throughput. None of it is derivable.

### Available on every order
`title` · `brief` · `wordCount` · `deadline` (may be null) · `stage` · `createdAt` · `updatedAt`

`updatedAt` changes whenever staff touch the row, so "last updated 2 days ago" is real. It is not
the same as "entered this stage 2 days ago" — it is any edit — so word it loosely if you use it.

### Derivable for a dashboard
Total orders · count per stage · active (in flight) vs finished · the next upcoming deadline ·
how many orders are past their deadline and not finished · total words on delivered orders ·
newest order · oldest in-flight order.

### Not available
Per-stage timestamps · turnaround or cycle time · on-time percentage · any historical trend ·
writer identity · revision or draft count · message threads · attachments or the finished article
itself · invoices, spend or plan.

If a screen wants one of these, say so — several are cheap to add. Do not design around the gap.

---

## The pipeline

Six stages. Five form the happy path; `cancelled` sits outside it.

| Stage | Label shown to client | Progress | Step | Client-facing description |
|---|---|---|---|---|
| `brief_received` | Brief received | 10% | 1 | We have your brief and it is queued for a writer. |
| `writing` | Writing | 40% | 2 | A writer is working on the first draft. |
| `editing` | Editing | 65% | 3 | The draft is with an editor for revisions. |
| `review` | Final review | 85% | 4 | Final quality check before delivery. |
| `delivered` | Delivered | 100% | 5 | This article is finished and delivered. |
| `cancelled` | Cancelled | 0% | — | This order was cancelled. |

Notes that affect the design:

- **Every new order starts at `brief_received`.** Enforced in the database; a client cannot create
  an order in any other stage.
- **`delivered` and `cancelled` are terminal.** Everything else is "in flight".
- **`cancelled` is not a failure.** It is outside the pipeline, not partway along it, and it is not
  an error state. Progress is 0%, not "stuck at 40%".
- The percentages above are the real numbers the progress indicator will receive.

---

## Fields and limits

### Order

| Field | Type | Limits |
|---|---|---|
| `title` | text | 3–120 characters, trimmed |
| `brief` | text | 10–5000 characters, trimmed |
| `wordCount` | integer | 100–10000, whole numbers only |
| `deadline` | date or null | `YYYY-MM-DD`; optional — an empty input is stored as null |
| `stage` | enum | one of the six above; set by staff, never by the client |
| `createdAt` / `updatedAt` | timestamp | system-managed |

### Profile and settings

| Field | Type | Limits |
|---|---|---|
| `email` | text | read-only in the UI |
| `fullName` | text or null | up to 120 characters |
| `company` | text or null | up to 120 characters |
| `avatarUrl` | URL or null | must be a valid URL |
| `notifications.statusChange` | boolean | default on |
| `notifications.delivered` | boolean | default on |
| `notifications.weeklySummary` | boolean | default off |
| `orderDefaults.wordCount` | integer or null | 100–10000 when set |
| `orderDefaults.tone` | text or null | up to 80 characters |
| `orderDefaults.audience` | text or null | up to 160 characters |

Order defaults pre-fill the new-order form for repeat clients. Nothing enforces them.

Password: minimum 8 characters, with a confirmation field that must match.

---

## Real error messages

Use these verbatim in error-state artboards. They already exist in the code.

**Form validation**
- `Enter a valid email address`
- `Password must be at least 8 characters`
- `Passwords do not match`
- `Give the article a title of at least 3 characters`
- `Title must be 120 characters or fewer`
- `Tell us a little more about what you need (10 characters minimum)`
- `Brief must be 5000 characters or fewer`
- `Enter a word count`
- `Word count must be a whole number`
- `Minimum order is 100 words`
- `For more than 10,000 words, please contact us directly`
- `Enter a valid date`
- `Enter a valid URL`

**Whole-form and auth**
- `Check the details below` — shown above a form when one or more fields failed
- `Email or password is incorrect` — sign-in failure. Deliberately vague, and deliberately the
  same whether the email exists or not. Do not split it into "no such account" / "wrong password".
- `An account with that email already exists` — sign-up with a taken address
- `You need to be signed in to do that`

---

## List controls

**Sort** — newest first (default) · oldest first · deadline soonest · deadline latest · title A–Z.

Orders with no deadline sort **last in both deadline directions**. "Whenever you can" is neither
the most nor the least urgent thing on the list; it is simply not on the schedule.

**Filter** — by stage, multi-select, any combination of the six. No filter means all.

**Search** — free text, matched against title and brief.

**Pagination** — 10 per page by default. The total count is always known, so "showing 1–10 of 34"
is available.

---

## The sample records

`fixtures/orders.json` — five real orders, one in each pipeline stage, with real titles and briefs
already written. These are the same records the running app shows in demo mode. Please use them.

`fixtures/profile.json` — a client with a name, a company, and non-default preferences set.

`fixtures/edge-cases.json` — eight records that break layouts:

| id | What it tests |
|---|---|
| `edge-max-title` | Title at exactly 120 characters |
| `edge-min-title` | Title at 3 characters |
| `edge-overdue` | Deadline in the past, still in flight |
| `edge-no-deadline` | Null deadline |
| `edge-cancelled` | The cancelled treatment |
| `edge-max-words` | 10,000 words — widest number |
| `edge-min-words` | 100 words |
| `edge-long-brief` | A brief long enough to dominate the detail page |

**None of the five sample orders is currently overdue**, which is why `edge-overdue` exists. An
order is overdue when its deadline has passed and its stage is not terminal, and that needs a
visibly different treatment from an order that is merely close to its deadline.
