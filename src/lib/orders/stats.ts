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
export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Past its deadline and not yet finished. Shared by the dashboard's overdue
 * count and any page that flags an individual order, so the two cannot
 * define "overdue" differently.
 */
export function isOverdue(
  order: Pick<Order, "deadline" | "status">,
  now = new Date(),
): boolean {
  if (order.deadline === null || !isActiveStatus(order.status)) return false;
  return order.deadline < today(now);
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

/**
 * The completion chart's vertical axis: a top value and the labels to print
 * beside evenly spaced gridlines, highest first.
 *
 * It lives here rather than in the chart component because getting it wrong is
 * a data bug wearing a layout costume. The previous version took three fixed
 * fractions of the maximum and rounded each one:
 *
 *     [top, round(top * 2 / 3), round(top / 3), 0]
 *
 * At a maximum of 2 that prints 2, 1, 1, 0 — the same label twice. At 1 it
 * prints 1, 1, 0, 0. Both are merely ugly. At 4 it prints 4, 3, 1, 0 against
 * gridlines that are still evenly spaced, so the line labelled 3 sits at two
 * thirds of the height while a bar of 3 reaches three quarters. That is a chart
 * that lies, and a reader has no way to see it happening.
 *
 * So the top is rounded up to something that divides evenly by the number of
 * gaps, and the bars are scaled against that same top. Every label then lands
 * on its own line, and the cost is only that a tall bar may stop short of the
 * frame.
 */
export function chartAxis(max: number): { top: number; ticks: number[] } {
  // An empty chart still needs a frame to be empty inside of.
  if (max <= 1) return { top: 1, ticks: [1, 0] };

  // Below four, one gridline per unit is exact and needs no rounding at all.
  if (max <= 3) {
    return { top: max, ticks: Array.from({ length: max + 1 }, (_, i) => max - i) };
  }

  // Otherwise four gridlines, with a top that is a multiple of three so the two
  // middle ones are whole numbers.
  const top = Math.ceil(max / 3) * 3;
  return { top, ticks: [top, (top / 3) * 2, top / 3, 0] };
}
