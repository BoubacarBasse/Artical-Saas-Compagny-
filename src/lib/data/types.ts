/**
 * The contract every data provider satisfies.
 *
 * There are two implementations — `mock` (cookie-backed demo data) and
 * `supabase` (real Postgres + Auth). Pages and Server Actions import only
 * `data` from `src/lib/data/index.ts` and never reference either one directly.
 *
 * Three properties of this interface are deliberate:
 *
 *  1. NO `userId` PARAMETER ANYWHERE. Every method resolves the caller itself.
 *     A page therefore *cannot* ask for another user's data even by mistake,
 *     and the mock provider ends up enforcing the same invariant that Postgres
 *     RLS enforces in production, rather than trusting each call site.
 *
 *  2. `listOrders` TAKES A QUERY. Search, filtering, sorting and pagination are
 *     pushed down into the provider. If the mock returned everything and the
 *     page filtered in memory, behaviour would silently change the moment we
 *     swapped to Supabase — and the "one switch" promise would be a lie.
 *
 *  3. AUTH LIVES HERE TOO, not just orders. That is what lets the whole
 *     sign-up / sign-in / permission surface be exercised in mock mode with no
 *     database attached.
 */

import type { OrderStage } from "@/lib/orders/stages";

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

export interface Order {
  id: string;
  userId: string;
  title: string;
  brief: string;
  wordCount: number;
  /** ISO date (YYYY-MM-DD) or null when the client set no deadline. */
  deadline: string | null;
  stage: OrderStage;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrderInput {
  title: string;
  brief: string;
  wordCount: number;
  deadline: string | null;
}

/**
 * Client-editable preferences.
 *
 * Stored as a single `jsonb` column rather than one column per toggle. This is
 * a design-led project: screenshots will reveal switches we have not thought of
 * yet, and shipping a migration for each one would slow the design loop to a
 * crawl. Shape is validated with Zod at the app boundary (see schemas.ts).
 * Anything we would ever filter or sort on stays a real column instead.
 */
export interface Preferences {
  notifications: {
    statusChange: boolean;
    delivered: boolean;
    weeklySummary: boolean;
  };
  orderDefaults: {
    wordCount: number | null;
    tone: string | null;
    audience: string | null;
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
  /** Empty or omitted means every stage. */
  stages?: OrderStage[];
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
  createOrder(input: NewOrderInput): Promise<Result<Order>>;

  // profile
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: ProfilePatch): Promise<Result<Profile>>;
}
