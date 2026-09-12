import { expect, test } from "@playwright/test";
import { isSeedOrder, seedOrders } from "@/lib/data/mock/seed";
import { ORDER_STAGES } from "@/lib/orders/stages";

test.describe("seeded demo orders", () => {
  test("are stable for the same user", () => {
    const first = seedOrders("11111111-2222-3333-4444-555555555555");
    const second = seedOrders("11111111-2222-3333-4444-555555555555");
    expect(first.map((o) => o.id)).toEqual(second.map((o) => o.id));
  });

  test("are namespaced per user, so ids never collide across accounts", () => {
    // This is what keeps user A from stumbling into user B's seed order id.
    const a = seedOrders("aaaaaaaa-0000-0000-0000-000000000000");
    const b = seedOrders("bbbbbbbb-0000-0000-0000-000000000000");
    const overlap = a.map((o) => o.id).filter((id) => b.some((o) => o.id === id));
    expect(overlap).toEqual([]);
  });

  test("all belong to the user they were generated for", () => {
    const userId = "cccccccc-0000-0000-0000-000000000000";
    expect(seedOrders(userId).every((o) => o.userId === userId)).toBe(true);
  });

  test("spread across the pipeline so the dashboard has something to show", () => {
    const stages = new Set(seedOrders("user").map((o) => o.stage));
    expect(stages.size).toBeGreaterThanOrEqual(4);
    for (const stage of stages) {
      expect(ORDER_STAGES).toContain(stage);
    }
  });

  test("carry valid, schema-shaped data", () => {
    for (const order of seedOrders("user")) {
      expect(order.title.length).toBeGreaterThanOrEqual(3);
      expect(order.brief.length).toBeGreaterThanOrEqual(10);
      expect(order.wordCount).toBeGreaterThanOrEqual(100);
      expect(order.wordCount).toBeLessThanOrEqual(10000);
      if (order.deadline !== null) {
        expect(order.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  test("include at least one in-flight order with a future deadline", () => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = seedOrders("user").filter(
      (o) => o.deadline !== null && o.deadline > today,
    );
    expect(upcoming.length).toBeGreaterThan(0);
  });

  test("are recognisable as seeds", () => {
    expect(isSeedOrder(seedOrders("user")[0].id)).toBe(true);
    expect(isSeedOrder(crypto.randomUUID())).toBe(false);
  });
});
