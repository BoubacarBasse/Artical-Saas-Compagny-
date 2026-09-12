/**
 * Dashboard figures, derived rather than stored.
 *
 * Pure and shared, so the mock provider and the Supabase provider cannot
 * disagree about what "overdue" means or how a month is bucketed.
 */

import type { DashboardStats, MonthlyCompletions, Order } from "@/lib/data/types";
import { isActiveStatus } from "./statuses";

/** How much history the completion chart shows. */
export const CHART_MONTHS = 7;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The last `count` calendar months ending with the current one, oldest first.
 *
 * Months with no completions are included with a zero. A real client has quiet
 * months, and dropping them would compress the gaps and make the account look
 * busier than it is.
 */
export function recentMonths(count = CHART_MONTHS, now = new Date()): MonthlyCompletions[] {
  const out: MonthlyCompletions[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push({ month: monthKey(d), label: MONTH_LABELS[d.getUTCMonth()], count: 0 });
  }
  return out;
}

/** Bucket delivery timestamps into the recent-months window. */
export function completionsByMonth(
  deliveredAt: string[],
  count = CHART_MONTHS,
  now = new Date(),
): MonthlyCompletions[] {
  const buckets = recentMonths(count, now);
  const index = new Map(buckets.map((b, i) => [b.month, i]));
  for (const iso of deliveredAt) {
    const key = iso.slice(0, 7);
    const at = index.get(key);
    if (at !== undefined) buckets[at].count += 1;
  }
  return buckets;
}

/** Today in UTC as `YYYY-MM-DD`, for deadline comparisons. */
function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function computeDashboardStats(
  orders: Order[],
  deliveredAt: string[],
  now = new Date(),
): DashboardStats {
  const day = today(now);
  const unfinished = orders.filter((o) => isActiveStatus(o.status));

  const upcoming = unfinished
    .map((o) => o.deadline)
    .filter((d): d is string => d !== null && d >= day)
    .sort();

  return {
    total: orders.length,
    draft: orders.filter((o) => o.status === "draft").length,
    inProgress: orders.filter((o) => o.status === "in_progress").length,
    pendingReview: orders.filter((o) => o.status === "pending_review").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
    overdue: unfinished.filter((o) => o.deadline !== null && o.deadline < day).length,
    nextDeadline: upcoming[0] ?? null,
    completionsByMonth: completionsByMonth(deliveredAt, CHART_MONTHS, now),
  };
}
