/**
 * Demo data, derived deterministically from the user id.
 *
 * Reconstructed on every read rather than stored in the cookie, so it costs
 * zero of the ~4KB budget and can be as rich as we like. Read-only:
 * `createOrder` only ever appends to the user's own list.
 *
 * Dates are relative to "now" so the dashboard always looks current.
 *
 * ON SCALE: one client of a writing agency orders a handful of pieces a month,
 * not hundreds. Thirteen orders across seven months, with one to three
 * completions in most months and at least one month with none, is what the real
 * thing looks like. A chart drawn against inflated numbers looks impressive in
 * a screenshot and then breaks the moment it meets a real account.
 */

import type { Assignee, Notification, Order, OrderEvent } from "../types";
import {
  STATUS_META,
  type OrderFormat,
  type OrderPriority,
  type OrderStatus,
} from "@/lib/orders/statuses";

const DAY = 24 * 60 * 60 * 1000;

const isoDate = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
const isoDateTime = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString();

/**
 * Writers are stored inline on each order (see `Assignee`), so this pool is
 * just a convenience for building the fixtures. `avatarUrl` is null throughout:
 * the UI falls back to initials, and the demo should not depend on a network
 * request to a third-party avatar service.
 */
const WRITERS: Record<string, Assignee> = {
  mara: { name: "Mara Lindqvist", avatarUrl: null },
  theo: { name: "Theo Abara", avatarUrl: null },
  ines: { name: "Inés Cabrera", avatarUrl: null },
  ruth: { name: "Ruth Mbeki", avatarUrl: null },
};

interface SeedSpec {
  slug: string;
  orderNumber: number;
  title: string;
  brief: string;
  keywords: string[];
  format: OrderFormat;
  wordCount: number;
  priority: OrderPriority;
  status: OrderStatus;
  writers: (keyof typeof WRITERS)[];
  createdDaysAgo: number;
  deadlineInDays: number | null;
  /** Days ago the piece was delivered. Required when status is completed. */
  completedDaysAgo?: number;
  deliverableFilename?: string;
}

/**
 * Thirteen orders over roughly seven months. Statuses are weighted the way a
 * real account is: mostly finished work behind you, one or two pieces moving.
 */
const SPECS: SeedSpec[] = [
  {
    slug: "1012", orderNumber: 1012,
    title: "Why your onboarding email sequence is too long",
    brief: "Opinionated take with a clear argument. Growth and lifecycle marketers. Include one worked example of a five-email sequence cut to three.",
    keywords: ["onboarding", "lifecycle email"], format: "blog_post",
    wordCount: 900, priority: "medium", status: "completed", writers: ["mara"],
    createdDaysAgo: 186, deadlineInDays: -172, completedDaysAgo: 174,
    deliverableFilename: "Onboarding_Sequence_Final.docx",
  },
  {
    slug: "1013", orderNumber: 1013,
    title: "A buyer's guide to headless CMS platforms",
    brief: "Comparison piece covering four platforms. Neutral tone, no vendor favouritism. Table of trade-offs at the end.",
    keywords: ["headless cms", "buyers guide"], format: "whitepaper",
    wordCount: 2600, priority: "high", status: "completed", writers: ["theo", "ines"],
    createdDaysAgo: 158, deadlineInDays: -140, completedDaysAgo: 143,
    deliverableFilename: "Headless_CMS_Buyers_Guide.docx",
  },
  {
    slug: "1014", orderNumber: 1014,
    title: "10 ways small teams can cut cloud spend",
    brief: "Practical, tactics-first listicle aimed at engineering leads at companies under 50 people. Cite real pricing where possible. Friendly but not jokey.",
    keywords: ["cloud cost", "finops"], format: "blog_post",
    wordCount: 1200, priority: "medium", status: "completed", writers: ["mara"],
    createdDaysAgo: 149, deadlineInDays: -136, completedDaysAgo: 138,
    deliverableFilename: "Cloud_Spend_Listicle.docx",
  },
  {
    slug: "1015", orderNumber: 1015,
    title: "Migrating a twelve-year-old Rails monolith",
    brief: "Long-form narrative piece. Interview notes supplied separately. Technical audience, so do not over-explain the basics.",
    keywords: ["rails", "migration", "legacy code"], format: "case_study",
    wordCount: 2400, priority: "high", status: "completed", writers: ["theo"],
    createdDaysAgo: 121, deadlineInDays: -104, completedDaysAgo: 107,
    deliverableFilename: "Rails_Monolith_Case_Study.docx",
  },
  {
    slug: "1016", orderNumber: 1016,
    title: "Q2 customer newsletter",
    brief: "Quarterly roundup for the existing customer list. Three product notes, one customer story, one short essay.",
    keywords: ["newsletter"], format: "newsletter",
    wordCount: 800, priority: "low", status: "completed", writers: ["ruth"],
    createdDaysAgo: 112, deadlineInDays: -98, completedDaysAgo: 101,
    deliverableFilename: "Q2_Newsletter.docx",
  },
  {
    slug: "1017", orderNumber: 1017,
    title: "What developer-first actually means",
    brief: "Category-defining essay. Willing to be contrarian. Should read like a point of view, not a feature list.",
    keywords: ["developer experience"], format: "blog_post",
    wordCount: 1500, priority: "medium", status: "cancelled", writers: [],
    createdDaysAgo: 96, deadlineInDays: -78,
  },
  {
    slug: "1018", orderNumber: 1018,
    title: "Pricing page copy rewrite",
    brief: "Rewrite of the three-tier pricing page. Needs to survive a legal review, so no unqualified superlatives.",
    keywords: ["pricing", "conversion"], format: "landing_page",
    wordCount: 600, priority: "high", status: "completed", writers: ["ines"],
    createdDaysAgo: 74, deadlineInDays: -62, completedDaysAgo: 64,
    deliverableFilename: "Pricing_Page_Copy_v2.docx",
  },
  {
    slug: "1019", orderNumber: 1019,
    title: "Customer success story: Acme Corp",
    brief: "Case study on Acme Corp's rollout. Quotes approved by their comms team, attached separately.",
    keywords: ["case study", "roi"], format: "case_study",
    wordCount: 1500, priority: "low", status: "completed", writers: ["ruth", "mara"],
    createdDaysAgo: 62, deadlineInDays: -48, completedDaysAgo: 51,
    deliverableFilename: "Customer_Success_Story_Final.docx",
  },
  {
    slug: "1020", orderNumber: 1020,
    title: "What actually changed in the 2026 accessibility rules",
    brief: "Explainer for product managers who are not lawyers. Lead with what they have to do differently, not with the history of the legislation.",
    keywords: ["accessibility", "compliance"], format: "whitepaper",
    wordCount: 1600, priority: "high", status: "completed", writers: ["theo"],
    createdDaysAgo: 44, deadlineInDays: -30, completedDaysAgo: 33,
    deliverableFilename: "Accessibility_Rules_2026.docx",
  },
  {
    slug: "1021", orderNumber: 1021,
    title: "Integrations launch announcement",
    brief: "Launch post for six new integrations. Short, concrete, one paragraph per integration.",
    keywords: ["product launch", "integrations"], format: "blog_post",
    wordCount: 1100, priority: "medium", status: "completed", writers: ["mara"],
    createdDaysAgo: 29, deadlineInDays: -16, completedDaysAgo: 18,
    deliverableFilename: "Integrations_Launch_Post.docx",
  },
  {
    slug: "1022", orderNumber: 1022,
    title: "Q3 newsletter",
    brief: "Quarterly roundup. Same shape as Q2. Lead with the integrations launch.",
    keywords: ["newsletter"], format: "newsletter",
    wordCount: 850, priority: "medium", status: "pending_review", writers: ["ruth"],
    createdDaysAgo: 16, deadlineInDays: 7,
  },
  {
    slug: "1023", orderNumber: 1023,
    title: "Landing page copy for the developer plan",
    brief: "New landing page for the self-serve developer tier. Draft only so far — still waiting on final pricing.",
    keywords: ["landing page", "developer plan"], format: "landing_page",
    wordCount: 700, priority: "low", status: "draft", writers: [],
    createdDaysAgo: 6, deadlineInDays: 22,
  },
  {
    slug: "1024", orderNumber: 1024,
    title: "SaaS Growth Guide",
    brief: "Comprehensive guide on increasing SaaS retention.",
    keywords: ["saas retention", "churn rate"], format: "whitepaper",
    wordCount: 5000, priority: "high", status: "in_progress", writers: ["theo", "ines", "mara"],
    createdDaysAgo: 4, deadlineInDays: 19,
  },
];

function orderId(userId: string, slug: string): string {
  return `${userId.slice(0, 8)}-order-${slug}`;
}

/** Stable across reloads because every id is derived from the user id. */
export function seedOrders(userId: string): Order[] {
  return SPECS.map((spec) => ({
    id: orderId(userId, spec.slug),
    orderNumber: spec.orderNumber,
    userId,
    title: spec.title,
    brief: spec.brief,
    keywords: spec.keywords,
    format: spec.format,
    wordCount: spec.wordCount,
    deadline: spec.deadlineInDays === null ? null : isoDate(spec.deadlineInDays),
    status: spec.status,
    priority: spec.priority,
    assignees: spec.writers.map((w) => WRITERS[w]),
    deliverable:
      spec.status === "completed" && spec.deliverableFilename
        ? {
            filename: spec.deliverableFilename,
            // Demo mode has no file storage. The design shows the download
            // affordance; the mock provider cannot actually serve bytes.
            url: "#demo-download-unavailable",
            uploadedAt: isoDateTime(-(spec.completedDaysAgo ?? 0)),
          }
        : null,
    createdAt: isoDateTime(-spec.createdDaysAgo),
    updatedAt: isoDateTime(-(spec.completedDaysAgo ?? Math.max(0, spec.createdDaysAgo - 2))),
  }));
}

/**
 * Events for every seeded order, newest first.
 *
 * Generated from each spec's status rather than hand-listed, so an order can
 * never show a timeline that contradicts its badge.
 */
export function seedEvents(userId: string): OrderEvent[] {
  const events: OrderEvent[] = [];

  for (const spec of SPECS) {
    const id = orderId(userId, spec.slug);
    const push = (kind: OrderEvent["kind"], label: string, daysAgo: number) =>
      events.push({
        id: `${id}-${kind}-${daysAgo}`,
        orderId: id,
        kind,
        label,
        createdAt: isoDateTime(-daysAgo),
      });

    push("submitted", "Order submitted", spec.createdDaysAgo);

    if (spec.status === "cancelled") {
      push("cancelled", "Order cancelled", Math.max(0, spec.createdDaysAgo - 8));
      continue;
    }
    if (spec.status === "draft") continue;

    const startedDaysAgo = Math.max(0, spec.createdDaysAgo - 1);
    push(
      "status_changed",
      `Status changed to ${STATUS_META.in_progress.label.toLowerCase()}`,
      startedDaysAgo,
    );

    if (spec.status === "in_progress") continue;

    const reviewDaysAgo = Math.max(0, (spec.completedDaysAgo ?? spec.createdDaysAgo) + 3);
    push(
      "status_changed",
      `Status changed to ${STATUS_META.pending_review.label.toLowerCase()}`,
      reviewDaysAgo,
    );

    if (spec.status === "pending_review") continue;

    const done = spec.completedDaysAgo ?? 0;
    push(
      "status_changed",
      `Status changed to ${STATUS_META.completed.label.toLowerCase()}`,
      done,
    );
    if (spec.deliverableFilename) {
      push("delivered", `Delivered ${spec.deliverableFilename}`, done);
    }
  }

  return events.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/**
 * A short notification history, newest first, with the two most recent unread.
 * Derived from the same specs so the inbox never references an order that does
 * not exist.
 */
export function seedNotifications(userId: string): Notification[] {
  const prefix = userId.slice(0, 8);
  const find = (slug: string) => SPECS.find((s) => s.slug === slug)!;

  const rows: Notification[] = [
    {
      id: `${prefix}-notif-1`,
      kind: "order_update",
      title: `Your order '${find("1024").title}' is now in progress`,
      orderId: orderId(userId, "1024"),
      createdAt: isoDateTime(-3),
      readAt: null,
    },
    {
      id: `${prefix}-notif-2`,
      kind: "order_update",
      title: `Order '${find("1022").title}' is ready for your review`,
      orderId: orderId(userId, "1022"),
      createdAt: isoDateTime(-9),
      readAt: null,
    },
    {
      id: `${prefix}-notif-3`,
      kind: "order_complete",
      title: `Order '${find("1021").title}' marked as complete`,
      orderId: orderId(userId, "1021"),
      createdAt: isoDateTime(-18),
      readAt: isoDateTime(-17),
    },
    {
      id: `${prefix}-notif-4`,
      kind: "order_complete",
      title: `Order '${find("1020").title}' marked as complete`,
      orderId: orderId(userId, "1020"),
      createdAt: isoDateTime(-33),
      readAt: isoDateTime(-32),
    },
    {
      id: `${prefix}-notif-5`,
      kind: "system",
      title: "Welcome to Article Orders",
      orderId: null,
      createdAt: isoDateTime(-186),
      readAt: isoDateTime(-186),
    },
  ];

  return rows;
}

export function isSeedOrder(id: string): boolean {
  return /-order-\d+$/.test(id);
}
