import type { Order } from "@/lib/data/types";
import type { OrderStage } from "@/lib/orders/stages";

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    userId: "user-1",
    title: "Untitled",
    brief: "A brief that is long enough to pass validation.",
    wordCount: 1000,
    deadline: null,
    stage: "brief_received" as OrderStage,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
