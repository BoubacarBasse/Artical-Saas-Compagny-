/**
 * Demo orders, derived deterministically from the user id.
 *
 * These are reconstructed on every read rather than stored in the cookie, so
 * they cost zero bytes of the ~4KB budget and can be as rich as we like. They
 * are read-only: `createOrder` only ever appends to the user's own list.
 *
 * Dates are relative to "now" so the dashboard always looks current instead of
 * slowly filling up with overdue demo work.
 */

import type { Order } from "../types";
import type { OrderStage } from "@/lib/orders/stages";

const DAY = 24 * 60 * 60 * 1000;

function isoDate(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}

function isoDateTime(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY).toISOString();
}

interface SeedSpec {
  slug: string;
  title: string;
  brief: string;
  wordCount: number;
  stage: OrderStage;
  createdDaysAgo: number;
  deadlineInDays: number | null;
}

/**
 * Spread across the pipeline on purpose: the dashboard, the progress bars, the
 * stage filter and the empty-vs-populated states all need something to show
 * before a single real order exists.
 */
const SPECS: SeedSpec[] = [
  {
    slug: "seed-1",
    title: "10 ways small teams can cut cloud spend",
    brief:
      "Practical, tactics-first listicle aimed at engineering leads at companies under 50 people. Cite real pricing where possible. Friendly but not jokey.",
    wordCount: 1200,
    stage: "delivered",
    createdDaysAgo: 24,
    deadlineInDays: -10,
  },
  {
    slug: "seed-2",
    title: "What actually changed in the 2026 accessibility rules",
    brief:
      "Explainer for product managers who are not lawyers. Lead with what they have to do differently, not with the history of the legislation.",
    wordCount: 1600,
    stage: "review",
    createdDaysAgo: 11,
    deadlineInDays: 3,
  },
  {
    slug: "seed-3",
    title: "Case study: migrating a 12-year-old Rails monolith",
    brief:
      "Long-form narrative piece. Interview notes will follow. Technical audience, so do not over-explain the basics.",
    wordCount: 2400,
    stage: "editing",
    createdDaysAgo: 8,
    deadlineInDays: 6,
  },
  {
    slug: "seed-4",
    title: "Why your onboarding email sequence is too long",
    brief:
      "Opinionated take with a clear argument. Growth and lifecycle marketers. Include one worked example of a five-email sequence cut to three.",
    wordCount: 900,
    stage: "writing",
    createdDaysAgo: 4,
    deadlineInDays: 9,
  },
  {
    slug: "seed-5",
    title: "A buyer's guide to headless CMS platforms",
    brief:
      "Comparison piece covering four platforms. Neutral tone, no vendor favouritism. Table of trade-offs at the end.",
    wordCount: 2000,
    stage: "brief_received",
    createdDaysAgo: 1,
    deadlineInDays: 21,
  },
];

/** Stable across reloads because the id is derived from the user id. */
export function seedOrders(userId: string): Order[] {
  const prefix = userId.slice(0, 8);
  return SPECS.map((spec) => ({
    id: `${prefix}-${spec.slug}`,
    userId,
    title: spec.title,
    brief: spec.brief,
    wordCount: spec.wordCount,
    deadline: spec.deadlineInDays === null ? null : isoDate(spec.deadlineInDays),
    stage: spec.stage,
    createdAt: isoDateTime(-spec.createdDaysAgo),
    updatedAt: isoDateTime(-Math.max(0, spec.createdDaysAgo - 2)),
  }));
}

export function isSeedOrder(id: string): boolean {
  return /-seed-\d+$/.test(id);
}
