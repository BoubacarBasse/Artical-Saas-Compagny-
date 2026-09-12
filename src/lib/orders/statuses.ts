/**
 * Order statuses — single source of truth.
 *
 * Flat badges, not a pipeline with a percentage. That is a deliberate change
 * from the earlier design: the reference screens show a status badge and no
 * progress bar, and with staff advancing orders by hand in the Supabase table
 * editor, fewer states means fewer chances for the data to go stale.
 *
 * Pure data with no imports, so it works on the server, on the client and in
 * tests without dragging anything along.
 */

export const ORDER_STATUSES = [
  "draft",
  "in_progress",
  "pending_review",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface StatusMeta {
  /** Badge text. Rendered uppercase in the UI, stored sentence case here. */
  label: string;
  /** No further work will happen on the order. */
  terminal: boolean;
  /** CSS custom property holding this status's accent colour. */
  cssVar: string;
  /** Heading shown in the order-content panel on the detail page. */
  contentHeading: string;
  /** Explanation shown under that heading. */
  contentBody: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  draft: {
    label: "Draft",
    terminal: false,
    cssVar: "--color-status-draft",
    contentHeading: "This order is still a draft",
    contentBody: "It has not been submitted yet, so no writer has picked it up.",
  },
  in_progress: {
    label: "In progress",
    terminal: false,
    cssVar: "--color-status-in-progress",
    contentHeading: "Content is being written",
    contentBody:
      "Your writer is currently working on this piece. You will be notified when it is ready for review.",
  },
  pending_review: {
    label: "Pending review",
    terminal: false,
    cssVar: "--color-status-pending-review",
    contentHeading: "Ready for your review",
    contentBody: "The draft is finished and waiting for you to read it.",
  },
  completed: {
    label: "Completed",
    terminal: true,
    cssVar: "--color-status-completed",
    contentHeading: "This order is complete",
    contentBody: "The finished piece is available to download.",
  },
  cancelled: {
    label: "Cancelled",
    terminal: true,
    cssVar: "--color-status-cancelled",
    contentHeading: "This order was cancelled",
    contentBody: "No further work will happen on it.",
  },
};

/** Every new order starts here. Enforced in the database by an RLS policy. */
export const INITIAL_STATUS: OrderStatus = "draft";

/** Still in flight — drives the dashboard's "in progress" count. */
export function isActiveStatus(status: OrderStatus): boolean {
  return !STATUS_META[status].terminal;
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value)
  );
}

// ---------------------------------------------------------------------------
// Formats and priority
// ---------------------------------------------------------------------------

export const ORDER_FORMATS = [
  "blog_post",
  "whitepaper",
  "case_study",
  "newsletter",
  "landing_page",
] as const;

export type OrderFormat = (typeof ORDER_FORMATS)[number];

export const FORMAT_LABELS: Record<OrderFormat, string> = {
  blog_post: "Blog post",
  whitepaper: "Whitepaper",
  case_study: "Case study",
  newsletter: "Newsletter",
  landing_page: "Landing page",
};

export function isOrderFormat(value: unknown): value is OrderFormat {
  return typeof value === "string" && (ORDER_FORMATS as readonly string[]).includes(value);
}

/**
 * Priority is set by staff, not by the client.
 *
 * If clients could set it, every order would be High and the field would carry
 * no information. It exists so the client can see how the work has been triaged,
 * not so they can jump the queue.
 */
export const ORDER_PRIORITIES = ["low", "medium", "high"] as const;

export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

export const PRIORITY_LABELS: Record<OrderPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const DEFAULT_PRIORITY: OrderPriority = "medium";

export function isOrderPriority(value: unknown): value is OrderPriority {
  return (
    typeof value === "string" && (ORDER_PRIORITIES as readonly string[]).includes(value)
  );
}
