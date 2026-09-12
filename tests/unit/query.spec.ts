import { expect, test } from "@playwright/test";
import { applyOrderQuery } from "@/lib/data/mock/query";
import { makeOrder } from "./fixtures";

/**
 * These assertions encode the semantics the Supabase provider must also
 * produce. If one side changes, this suite is where the drift should surface.
 */

const orders = [
  makeOrder({
    id: "a",
    title: "Cloud cost guide",
    brief: "About saving money on infrastructure",
    stage: "delivered",
    createdAt: "2026-01-01T00:00:00.000Z",
    deadline: "2026-03-01",
  }),
  makeOrder({
    id: "b",
    title: "Accessibility rules",
    brief: "Explainer for product managers",
    stage: "review",
    createdAt: "2026-02-01T00:00:00.000Z",
    deadline: "2026-02-01",
  }),
  makeOrder({
    id: "c",
    title: "Zebra migration story",
    brief: "Mentions cloud in passing",
    stage: "writing",
    createdAt: "2026-03-01T00:00:00.000Z",
    deadline: null,
  }),
];

test.describe("order query engine", () => {
  test("defaults to newest first", () => {
    expect(applyOrderQuery(orders).rows.map((o) => o.id)).toEqual(["c", "b", "a"]);
  });

  test("searches title and brief, case-insensitively", () => {
    expect(applyOrderQuery(orders, { search: "CLOUD" }).rows.map((o) => o.id).sort())
      .toEqual(["a", "c"]);
    expect(applyOrderQuery(orders, { search: "product managers" }).rows.map((o) => o.id))
      .toEqual(["b"]);
    expect(applyOrderQuery(orders, { search: "nothing matches" }).total).toBe(0);
  });

  test("trims the search term and ignores an empty one", () => {
    expect(applyOrderQuery(orders, { search: "   " }).total).toBe(3);
    expect(applyOrderQuery(orders, { search: "  cloud  " }).total).toBe(2);
  });

  test("filters by stage, and an empty stage list means no filter", () => {
    expect(applyOrderQuery(orders, { stages: ["writing"] }).rows.map((o) => o.id))
      .toEqual(["c"]);
    expect(applyOrderQuery(orders, { stages: ["writing", "review"] }).total).toBe(2);
    expect(applyOrderQuery(orders, { stages: [] }).total).toBe(3);
  });

  test("combines search and stage filters", () => {
    const page = applyOrderQuery(orders, { search: "cloud", stages: ["delivered"] });
    expect(page.rows.map((o) => o.id)).toEqual(["a"]);
  });

  test("sorts by creation date in both directions", () => {
    expect(applyOrderQuery(orders, { sort: "created_asc" }).rows.map((o) => o.id))
      .toEqual(["a", "b", "c"]);
    expect(applyOrderQuery(orders, { sort: "created_desc" }).rows.map((o) => o.id))
      .toEqual(["c", "b", "a"]);
  });

  test("sorts by title alphabetically", () => {
    expect(applyOrderQuery(orders, { sort: "title_asc" }).rows.map((o) => o.id))
      .toEqual(["b", "a", "c"]);
  });

  test("puts orders with no deadline last in BOTH directions", () => {
    // "Whenever you can" is neither the most nor the least urgent thing on the
    // list — it is simply not on the schedule. Mirrors nullsFirst:false.
    expect(applyOrderQuery(orders, { sort: "deadline_asc" }).rows.map((o) => o.id))
      .toEqual(["b", "a", "c"]);
    expect(applyOrderQuery(orders, { sort: "deadline_desc" }).rows.map((o) => o.id))
      .toEqual(["a", "b", "c"]);
  });

  test("paginates and reports the unpaginated total", () => {
    const page1 = applyOrderQuery(orders, { perPage: 2, page: 1 });
    expect(page1.rows.map((o) => o.id)).toEqual(["c", "b"]);
    expect(page1.total).toBe(3);
    expect(page1.pageCount).toBe(2);

    const page2 = applyOrderQuery(orders, { perPage: 2, page: 2 });
    expect(page2.rows.map((o) => o.id)).toEqual(["a"]);
    expect(page2.total).toBe(3);
  });

  test("a page beyond the end is empty but still reports the total", () => {
    const page = applyOrderQuery(orders, { perPage: 2, page: 99 });
    expect(page.rows).toEqual([]);
    expect(page.total).toBe(3);
  });

  test("clamps nonsense pagination instead of throwing", () => {
    expect(applyOrderQuery(orders, { page: 0 }).page).toBe(1);
    expect(applyOrderQuery(orders, { page: -5 }).page).toBe(1);
    expect(applyOrderQuery(orders, { perPage: 0 }).perPage).toBe(1);
    expect(applyOrderQuery(orders, { perPage: 5000 }).perPage).toBe(100);
  });

  test("an empty set still reports a sane page count", () => {
    const page = applyOrderQuery([], {});
    expect(page.total).toBe(0);
    expect(page.pageCount).toBe(1);
  });

  test("does not mutate the array it is given", () => {
    const input = [...orders];
    applyOrderQuery(input, { sort: "title_asc" });
    expect(input.map((o) => o.id)).toEqual(["a", "b", "c"]);
  });
});
