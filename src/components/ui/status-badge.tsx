import { STATUS_META, type OrderStatus } from "@/lib/orders/statuses";

const CLASSES: Record<OrderStatus, string> = {
  draft: "bg-status-draft-bg text-status-draft-fg",
  in_progress: "bg-status-in-progress-bg text-status-in-progress-fg",
  pending_review: "bg-status-pending-review-bg text-status-pending-review-fg",
  completed: "bg-status-completed-bg text-status-completed-fg",
  cancelled: "bg-status-cancelled-bg text-status-cancelled-fg",
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap ${CLASSES[status]} ${className}`}
    >
      {STATUS_META[status].label}
    </span>
  );
}

export function statusDotClass(status: OrderStatus): string {
  return (
    {
      draft: "bg-status-draft-dot",
      in_progress: "bg-status-in-progress-dot",
      pending_review: "bg-status-pending-review-dot",
      completed: "bg-status-completed-dot",
      cancelled: "bg-status-cancelled-dot",
    } satisfies Record<OrderStatus, string>
  )[status];
}
