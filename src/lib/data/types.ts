/**
 * The contract every data provider satisfies.
 *
 * Two implementations — `mock` (cookie-backed demo data) and `supabase` (real
 * Postgres + Auth). Pages and Server Actions import only `data` from
 * `src/lib/data/index.ts` and never reference either one directly.
 *
 * Three properties of this interface are deliberate:
 *
 *  1. NO `userId` PARAMETER ANYWHERE. Every method resolves the caller itself,
 *     so a page cannot request another user's data even by accident, and the
 *     mock provider ends up enforcing the same invariant that Postgres RLS
 *     enforces in production.
 *
 *  2. `listOrders` TAKES A QUERY. Search, filtering, sorting and pagination are
 *     pushed into the provider. Filtering in the page would silently change
 *     behaviour the moment we swapped to Postgres.
 *
 *  3. AUTH LIVES HERE TOO, so the whole sign-up and permission surface is
 *     exercisable with no database attached.
 */

import type {
  OrderFormat,
  OrderPriority,
  OrderStatus,
} from "@/lib/orders/statuses";

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

/**
 * Providers never throw for *expected* failures (bad password, duplicate email,
 * validation). Those come back as `ok: false` so Server Actions can render them
 * inline. Genuine faults — network down, misconfiguration — still throw.
 */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const err = <T = never>(
  error: string,
  fieldErrors?: Record<string, string>,
): Result<T> => ({ ok: false, error, fieldErrors });

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * A writer working on an order.
 *
 * Stored inline on the order rather than in a writers table with a join. In v1
 * staff maintain orders by editing one row in the Supabase table editor, and a
 * join table would mean editing two places to reassign a piece. Denormalised on
 * purpose; revisit if writers ever get their own login.
 */
export interface Assignee {
  name: string;
  avatarUrl: string | null;
}

/** The finished piece. Null until the work is delivered. */
export interface Deliverable {
  filename: string;
  url: string;
  uploadedAt: string;
}

export interface Order {
  id: string;
  /** Human-readable reference shown as "Order #1024". Unique per system. */
  orderNumber: number;
  userId: string;
  title: string;
  brief: string;
  /** SEO terms the client wants covered. May be empty. */
  keywords: string[];
  format: OrderFormat;
  wordCount: number;
  /** ISO date (YYYY-MM-DD), or null when the client set no deadline. */
  deadline: string | null;
  status: OrderStatus;
  /** Set by staff, read by the client. Not client-editable. */
  priority: OrderPriority;
  assignees: Assignee[];
  deliverable: Deliverable | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrderInput {
  title: string;
  brief: string;
  keywords: string[];
  format: OrderFormat;
  wordCount: number;
  deadline: string | null;
}

/**
 * One entry in an order's history.
 *
 * This is what makes the detail-page timeline possible. An earlier revision of
 * the model stored only the current status, which meant a timeline could show
 * *what* had happened but never *when*. Events are append-only and written by
 * staff actions, never by clients.
 */
export interface OrderEvent {
  id: string;
  orderId: string;
  kind: "submitted" | "status_changed" | "delivered" | "cancelled";
  /** Pre-rendered for display, e.g. "Status changed to in progress". */
  label: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  kind: "order_update" | "order_complete" | "system";
  title: string;
  /** Deep link to the order this concerns, when there is one. */
  orderId: string | null;
  createdAt: string;
  readAt: string | null;
}

/**
 * Client-editable preferences.
 *
 * A single jsonb column rather than one column per toggle. Screenshots reveal
 * switches nobody anticipated, and shipping a migration for each one would slow
 * the design loop. Shape is validated with Zod on the way in and on the way out
 * (see schemas.ts). Anything we would filter or sort on gets a real column.
 */
export interface Preferences {
  notifications: {
    statusChange: boolean;
    delivered: boolean;
    weeklySummary: boolean;
  };
  orderDefaults: {
    wordCount: number | null;
    format: OrderFormat | null;
    tone: string | null;
  };
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  company: string | null;
  avatarUrl: string | null;
  preferences: Preferences;
  createdAt: string;
}

export type ProfilePatch = Partial<
  Pick<Profile, "fullName" | "company" | "avatarUrl" | "preferences">
>;

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface MonthlyCompletions {
  /** `YYYY-MM`, for sorting and keys. */
  month: string;
  /** Short label for the axis, e.g. "Mar". */
  label: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  draft: number;
  inProgress: number;
  pendingReview: number;
  completed: number;
  cancelled: number;
  /** Orders past their deadline and not yet finished. */
  overdue: number;
  /** Soonest upcoming deadline on an unfinished order, or null. */
  nextDeadline: string | null;
  /**
   * Completions per calendar month, oldest first, including months with none.
   *
   * Real numbers for one client of a writing agency are small — one to three a
   * month, with gaps. The chart has to be honest at that scale rather than
   * assume hundreds.
   */
  completionsByMonth: MonthlyCompletions[];
}

// ---------------------------------------------------------------------------
// Querying
// ---------------------------------------------------------------------------

export const ORDER_SORTS = [
  "created_desc",
  "created_asc",
  "deadline_asc",
  "deadline_desc",
  "title_asc",
] as const;

export type OrderSort = (typeof ORDER_SORTS)[number];

export const DEFAULT_PER_PAGE = 10;

export interface OrderQuery {
  /** Free-text match against title and brief. */
  search?: string;
  /** Empty or omitted means every status. */
  statuses?: OrderStatus[];
  sort?: OrderSort;
  /** 1-based. */
  page?: number;
  perPage?: number;
}

export interface Page<T> {
  rows: T[];
  /** Total matching the filter, before pagination — drives the pager. */
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

// ---------------------------------------------------------------------------
// The interface
// ---------------------------------------------------------------------------

export interface DataProvider {
  /** Identifies the implementation. Used by the demo-mode banner and tests. */
  readonly name: "mock" | "supabase";

  // auth
  signUp(email: string, password: string): Promise<Result<SessionUser>>;
  signIn(email: string, password: string): Promise<Result<SessionUser>>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<SessionUser | null>;
  updatePassword(nextPassword: string): Promise<Result<void>>;

  // orders
  listOrders(query?: OrderQuery): Promise<Page<Order>>;
  /** Returns null when the order does not exist OR is not the caller's. */
  getOrder(id: string): Promise<Order | null>;
  /** Newest first. Empty when the order is not the caller's. */
  getOrderEvents(orderId: string): Promise<OrderEvent[]>;
  createOrder(input: NewOrderInput): Promise<Result<Order>>;

  // dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // notifications
  listNotifications(): Promise<Notification[]>;
  unreadNotificationCount(): Promise<number>;
  markAllNotificationsRead(): Promise<Result<void>>;

  // profile
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: ProfilePatch): Promise<Result<Profile>>;
}
