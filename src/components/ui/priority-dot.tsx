import { PRIORITY_LABELS, type OrderPriority } from "@/lib/orders/statuses";

const CLASSES: Record<OrderPriority, string> = {
  low: "bg-priority-low",
  medium: "bg-priority-medium",
  high: "bg-priority-high",
};

/** Read-only. Staff-set, client-readable — never a control. */
export function PriorityDot({ priority }: { priority: OrderPriority }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
      <span className={`block h-1.5 w-1.5 rounded-xs ${CLASSES[priority]}`} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
