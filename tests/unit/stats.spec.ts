import { expect, test } from "@playwright/test";
import {
  CHART_MONTHS,
  completionsByMonth,
  computeDashboardStats,
  recentMonths,
} from "@/lib/orders/stats";
import { makeOrder } from "./fixtures";

const NOW = new Date("2026-09-12T00:00:00.000Z");

test.describe("month buckets", () => {
  test("returns the window oldest first, ending with the current month", () => {
    const months = recentMonths(CHART_MONTHS, NOW);
    expect(months).toHaveLength(7);
    expect(months[0].month).toBe("2026-03");
    expect(months.at(-1)!.month).toBe("2026-09");
    expect(months.at(-1)!.label).toBe("Sep");
  });

  test("keeps months with no completions instead of dropping them", () => {
    // A real client has quiet months. Dropping them would compress the gaps and
    // make the account look busier than it is.
    const buckets = completionsByMonth(["2026-09-02T00:00:00.000Z"], CHART_MONTHS, NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets.filter((b) => b.count === 0)).toHaveLength(6);
  });

  test("counts several completions in one month", () => {
    const buckets = completionsByMonth(
      ["2026-07-02T00:00:00.000Z", "2026-07-19T00:00:00.000Z", "2026-08-01T00:00:00.000Z"],
      CHART_MONTHS,
      NOW,
    );
    expect(buckets.find((b) => b.month === "2026-07")!.count).toBe(2);
    expect(buckets.find((b) => b.month === "2026-08")!.count).toBe(1);
  });

  test("ignores completions outside the window", () => {
    const buckets = completionsByMonth(["2024-01-01T00:00:00.000Z"], CHART_MONTHS, NOW);
    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(0);
  });

  test("crosses a year boundary correctly", () => {
    const months = recentMonths(4, new Date("2026-02-10T00:00:00.000Z"));
    expect(months.map((m) => m.month)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

test.describe("dashboard stats", () => {
  const orders = [
    makeOrder({ id: "a", status: "completed", deadline: "2026-08-01" }),
    makeOrder({ id: "b", status: "completed", deadline: "2026-08-20" }),
    makeOrder({ id: "c", status: "in_progress", deadline: "2026-09-30" }),
    makeOrder({ id: "d", status: "pending_review", deadline: "2026-09-20" }),
    makeOrder({ id: "e", status: "draft", deadline: null }),
    makeOrder({ id: "f", status: "cancelled", deadline: "2026-09-01" }),
    makeOrder({ id: "g", status: "in_progress", deadline: "2026-09-01" }), // overdue
  ];

  test("counts each status", () => {
    const s = computeDashboardStats(orders, [], NOW);
    expect(s.total).toBe(7);
    expect(s.completed).toBe(2);
    expect(s.inProgress).toBe(2);
    expect(s.pendingReview).toBe(1);
    expect(s.draft).toBe(1);
    expect(s.cancelled).toBe(1);
  });

  test("overdue means past deadline AND unfinished", () => {
    const s = computeDashboardStats(orders, [], NOW);
    // 'g' only. 'a' and 'b' are past their deadlines but finished, and 'f' is
    // cancelled — neither is work anyone is waiting on.
    expect(s.overdue).toBe(1);
  });

  test("next deadline is the soonest upcoming one on unfinished work", () => {
    const s = computeDashboardStats(orders, [], NOW);
    expect(s.nextDeadline).toBe("2026-09-20");
  });

  test("next deadline is null when nothing is scheduled", () => {
    const s = computeDashboardStats([makeOrder({ status: "draft", deadline: null })], [], NOW);
    expect(s.nextDeadline).toBeNull();
  });

  test("an empty account still returns a full chart window", () => {
    const s = computeDashboardStats([], [], NOW);
    expect(s.total).toBe(0);
    expect(s.completionsByMonth).toHaveLength(CHART_MONTHS);
    expect(s.completionsByMonth.every((m) => m.count === 0)).toBe(true);
  });
});
