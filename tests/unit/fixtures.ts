import type { Order } from "@/lib/data/types";

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    orderNumber: 1001,
    userId: "user-1",
    title: "Untitled",
    brief: "A brief that is long enough to pass validation.",
    keywords: [],
    format: "blog_post",
    wordCount: 1000,
    deadline: null,
    status: "draft",
    priority: "medium",
    assignees: [],
    deliverable: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
