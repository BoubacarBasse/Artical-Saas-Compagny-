import { expect, test } from "@playwright/test";
import {
  DEFAULT_PRIORITY,
  FORMAT_LABELS,
  INITIAL_STATUS,
  ORDER_FORMATS,
  ORDER_PRIORITIES,
  ORDER_STATUSES,
  PRIORITY_LABELS,
  STATUS_META,
  isActiveStatus,
  isOrderFormat,
  isOrderPriority,
  isOrderStatus,
} from "@/lib/orders/statuses";

test.describe("order statuses", () => {
  test("are the five the reference screens show", () => {
    expect([...ORDER_STATUSES]).toEqual([
      "draft",
      "in_progress",
      "pending_review",
      "completed",
      "cancelled",
    ]);
  });

  test("new orders start as a draft", () => {
    expect(INITIAL_STATUS).toBe("draft");
    expect(isActiveStatus(INITIAL_STATUS)).toBe(true);
  });

  test("only completed and cancelled are terminal", () => {
    const terminal = ORDER_STATUSES.filter((s) => STATUS_META[s].terminal);
    expect([...terminal].sort()).toEqual(["cancelled", "completed"]);
    expect(isActiveStatus("in_progress")).toBe(true);
    expect(isActiveStatus("pending_review")).toBe(true);
    expect(isActiveStatus("completed")).toBe(false);
  });

  test("carry no progress percentage", () => {
    // Deliberate: the reference shows flat badges and no progress bar, and a
    // percentage would be a second thing for staff to keep in sync by hand.
    for (const status of ORDER_STATUSES) {
      expect(STATUS_META[status]).not.toHaveProperty("percent");
    }
  });

  test("every status has a label, copy and a distinct colour token", () => {
    const vars = ORDER_STATUSES.map((s) => STATUS_META[s].cssVar);
    expect(new Set(vars).size).toBe(ORDER_STATUSES.length);
    for (const status of ORDER_STATUSES) {
      expect(STATUS_META[status].label.length).toBeGreaterThan(0);
      expect(STATUS_META[status].contentHeading.length).toBeGreaterThan(0);
      expect(STATUS_META[status].contentBody.length).toBeGreaterThan(0);
    }
  });

  test("the type guard rejects anything not a status", () => {
    expect(isOrderStatus("in_progress")).toBe(true);
    expect(isOrderStatus("delivered")).toBe(false); // an event kind, not a status
    expect(isOrderStatus(null)).toBe(false);
  });
});

test.describe("formats and priority", () => {
  test("every format has a label", () => {
    for (const format of ORDER_FORMATS) {
      expect(FORMAT_LABELS[format].length).toBeGreaterThan(0);
    }
    expect(isOrderFormat("whitepaper")).toBe(true);
    expect(isOrderFormat("poem")).toBe(false);
  });

  test("priority defaults to the middle, not to high", () => {
    // Staff set priority. If it defaulted high, every order would be high and
    // the field would carry no information at all.
    expect(DEFAULT_PRIORITY).toBe("medium");
    expect([...ORDER_PRIORITIES]).toEqual(["low", "medium", "high"]);
    for (const p of ORDER_PRIORITIES) {
      expect(PRIORITY_LABELS[p].length).toBeGreaterThan(0);
    }
    expect(isOrderPriority("high")).toBe(true);
    expect(isOrderPriority("urgent")).toBe(false);
  });
});
