import { expect, test } from "@playwright/test";
import {
  isSeedOrder,
  seedEvents,
  seedNotifications,
  seedOrders,
} from "@/lib/data/mock/seed";
import { ORDER_STATUSES } from "@/lib/orders/statuses";
import { CHART_MONTHS, completionsByMonth } from "@/lib/orders/stats";

const USER = "8f14e45f-ceea-467a-9f7c-3b2a1d4e5f60";

test.describe("seeded orders", () => {
  test("are stable for the same user", () => {
    expect(seedOrders(USER).map((o) => o.id)).toEqual(seedOrders(USER).map((o) => o.id));
  });

  test("are namespaced per user, so ids never collide across accounts", () => {
    // This is what keeps user A from stumbling into user B's seeded order id.
    const a = seedOrders("aaaaaaaa-0000-0000-0000-000000000000");
    const b = seedOrders("bbbbbbbb-0000-0000-0000-000000000000");
    expect(a.map((o) => o.id).filter((id) => b.some((o) => o.id === id))).toEqual([]);
  });

  test("all belong to the user they were generated for", () => {
    expect(seedOrders(USER).every((o) => o.userId === USER)).toBe(true);
  });

  test("order numbers are unique and rise with creation date", () => {
    const byCreated = [...seedOrders(USER)].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1,
    );
    const numbers = byCreated.map((o) => o.orderNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  test("cover every status", () => {
    const seen = new Set(seedOrders(USER).map((o) => o.status));
    for (const status of ORDER_STATUSES) expect(seen).toContain(status);
  });

  test("only completed orders have a deliverable", () => {
    for (const order of seedOrders(USER)) {
      if (order.status === "completed") expect(order.deliverable).not.toBeNull();
      else expect(order.deliverable).toBeNull();
    }
  });

  test("unstarted work has no writer assigned", () => {
    for (const order of seedOrders(USER)) {
      if (order.status === "draft" || order.status === "cancelled") {
        expect(order.assignees).toEqual([]);
      }
    }
  });

  test("carry valid, schema-shaped data", () => {
    for (const o of seedOrders(USER)) {
      expect(o.title.length).toBeGreaterThanOrEqual(3);
      expect(o.title.length).toBeLessThanOrEqual(120);
      expect(o.brief.length).toBeGreaterThanOrEqual(10);
      expect(o.wordCount).toBeGreaterThanOrEqual(100);
      expect(o.wordCount).toBeLessThanOrEqual(10000);
      expect(o.keywords.length).toBeLessThanOrEqual(10);
      if (o.deadline !== null) expect(o.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test("are recognisable as seeds", () => {
    expect(isSeedOrder(seedOrders(USER)[0].id)).toBe(true);
    expect(isSeedOrder(crypto.randomUUID())).toBe(false);
  });
});

test.describe("seeded events", () => {
  test("every order opens with a submitted event", () => {
    const events = seedEvents(USER);
    for (const order of seedOrders(USER)) {
      const own = events.filter((e) => e.orderId === order.id);
      expect(own.some((e) => e.kind === "submitted")).toBe(true);
    }
  });

  test("a timeline never contradicts the badge", () => {
    // The whole point of generating events from the spec rather than listing
    // them by hand: a draft cannot show a delivery, and a completed order must.
    const events = seedEvents(USER);
    for (const order of seedOrders(USER)) {
      const kinds = events.filter((e) => e.orderId === order.id).map((e) => e.kind);
      if (order.status === "draft") expect(kinds).toEqual(["submitted"]);
      if (order.status === "completed") expect(kinds).toContain("delivered");
      if (order.status !== "completed") expect(kinds).not.toContain("delivered");
      if (order.status === "cancelled") expect(kinds).toContain("cancelled");
    }
  });

  test("are newest first", () => {
    const dates = seedEvents(USER).map((e) => e.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test("reference only real orders", () => {
    const ids = new Set(seedOrders(USER).map((o) => o.id));
    expect(seedEvents(USER).every((e) => ids.has(e.orderId))).toBe(true);
  });
});

test.describe("chart realism", () => {
  test("monthly completions stay at agency scale, not template scale", () => {
    // The reference design's chart peaks near 1000 a month. One client of a
    // writing agency orders a handful. A chart drawn against inflated numbers
    // looks impressive in a screenshot and breaks against a real account.
    const delivered = seedEvents(USER)
      .filter((e) => e.kind === "delivered")
      .map((e) => e.createdAt);
    const buckets = completionsByMonth(delivered, CHART_MONTHS);

    expect(buckets).toHaveLength(CHART_MONTHS);
    for (const b of buckets) {
      expect(b.count).toBeLessThanOrEqual(4);
      expect(b.count).toBeGreaterThanOrEqual(0);
    }
  });

  test("the chart always has something to draw", () => {
    const delivered = seedEvents(USER)
      .filter((e) => e.kind === "delivered")
      .map((e) => e.createdAt);
    const buckets = completionsByMonth(delivered, CHART_MONTHS);

    expect(buckets.reduce((n, b) => n + b.count, 0)).toBeGreaterThan(0);
  });

  // This used to also assert that the seeded deliveries left at least one month
  // of the window empty, so the design had to cope with a zero bar. That is a
  // real requirement and it was being checked in the wrong place: the seed lays
  // its deliveries out in days-ago offsets, so which calendar months they land
  // in — and therefore whether any month comes out empty — moves with the date
  // the suite happens to run on. It held for months and then failed on a day
  // when all nine deliveries happened to spread across all seven buckets.
  //
  // A test that passes or fails on the calendar is not testing the code. The
  // requirement belongs to the bucketing function, which is pure and takes an
  // injectable `now`, so it can be pinned and stated outright.
  test("a month with no deliveries is kept, as a zero", () => {
    const now = new Date("2026-09-19T00:00:00Z");
    const buckets = completionsByMonth(
      ["2026-09-01T00:00:00Z", "2026-07-30T00:00:00Z"],
      CHART_MONTHS,
      now,
    );

    expect(buckets.map((b) => b.label)).toEqual([
      "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
    ]);
    // The quiet months are present and zero, not dropped — dropping them would
    // close the gaps and make the account look busier than it is.
    expect(buckets.map((b) => b.count)).toEqual([0, 0, 0, 0, 1, 0, 1]);
  });
});

test.describe("seeded notifications", () => {
  test("are newest first and start with unread ones", () => {
    const rows = seedNotifications(USER);
    const dates = rows.map((n) => n.createdAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(rows[0].readAt).toBeNull();
  });

  test("leave a couple unread so the badge has something to show", () => {
    const unread = seedNotifications(USER).filter((n) => n.readAt === null);
    expect(unread.length).toBeGreaterThan(0);
    expect(unread.length).toBeLessThanOrEqual(3);
  });

  test("only ever link to orders that exist", () => {
    const ids = new Set(seedOrders(USER).map((o) => o.id));
    for (const n of seedNotifications(USER)) {
      if (n.orderId !== null) expect(ids.has(n.orderId)).toBe(true);
    }
  });
});
