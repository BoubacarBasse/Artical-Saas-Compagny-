/**
 * Mock implementation of DataProvider — cookie-backed, no database.
 *
 * It implements the full query contract (search, status filter, sort,
 * pagination) rather than returning everything and letting pages filter in
 * memory. If the mock were loose here, swapping to Supabase would change
 * behaviour and the "one switch" promise would be false.
 *
 * Demo fixture, not a security boundary — see state.ts.
 */

import {
  DEFAULT_PER_PAGE,
  err,
  ok,
  type DashboardStats,
  type DataProvider,
  type NewOrderInput,
  type Notification,
  type Order,
  type OrderEvent,
  type OrderQuery,
  type Page,
  type Profile,
  type ProfilePatch,
  type Result,
  type SessionUser,
} from "../types";
import {
  DEFAULT_PREFERENCES,
  credentialsSchema,
  fieldErrorsFrom,
  newOrderSchema,
  parsePreferences,
  passwordSchema,
  profilePatchSchema,
} from "../schemas";
import { DEFAULT_PRIORITY, INITIAL_STATUS } from "@/lib/orders/statuses";
import { computeDashboardStats } from "@/lib/orders/stats";
import { hashPassword, type MockState } from "./state";
import { readState, writeState } from "./store";
import { seedEvents, seedNotifications, seedOrders } from "./seed";
import { applyOrderQuery } from "./query";

const NOT_SIGNED_IN = "You need to be signed in to do that";

/** Seeded demo orders plus anything the user has created, newest last. */
function allOrders(state: MockState): Order[] {
  return [...seedOrders(state.user.id), ...state.orders];
}

/**
 * Events for user-created orders are synthesised rather than stored: a client
 * can only ever create an order, so its history is always exactly one entry.
 */
function allEvents(state: MockState): OrderEvent[] {
  const own: OrderEvent[] = state.orders.map((o) => ({
    id: `${o.id}-submitted`,
    orderId: o.id,
    kind: "submitted",
    label: "Order submitted",
    createdAt: o.createdAt,
  }));
  return [...seedEvents(state.user.id), ...own].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

function allNotifications(state: MockState): Notification[] {
  const readAt = state.notificationsReadAt;
  return seedNotifications(state.user.id).map((n) =>
    n.readAt === null && readAt !== null && n.createdAt <= readAt
      ? { ...n, readAt }
      : n,
  );
}

function newState(email: string, passwordHash: string): MockState {
  return {
    user: { id: crypto.randomUUID(), email, passwordHash },
    profile: {
      fullName: null,
      company: null,
      avatarUrl: null,
      preferences: DEFAULT_PREFERENCES,
      createdAt: new Date().toISOString(),
    },
    orders: [],
    notificationsReadAt: null,
    authenticated: true,
  };
}

function toProfile(state: MockState): Profile {
  return {
    id: state.user.id,
    email: state.user.email,
    fullName: state.profile.fullName,
    company: state.profile.company,
    avatarUrl: state.profile.avatarUrl,
    preferences: parsePreferences(state.profile.preferences),
    createdAt: state.profile.createdAt,
  };
}

/** Resolves the caller. Note nothing accepts a user id from outside. */
async function currentState(): Promise<MockState | null> {
  const state = await readState();
  return state?.authenticated ? state : null;
}

export const mockProvider: DataProvider = {
  name: "mock",

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  async signUp(email, password): Promise<Result<SessionUser>> {
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      return err("Check the details below", fieldErrorsFrom(parsed.error));
    }

    const existing = await readState();
    if (existing && existing.user.email === parsed.data.email) {
      return err("An account with that email already exists", {
        email: "An account with that email already exists",
      });
    }

    const state = newState(parsed.data.email, await hashPassword(parsed.data.password));
    await writeState(state);
    return ok({ id: state.user.id, email: state.user.email });
  },

  async signIn(email, password): Promise<Result<SessionUser>> {
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      return err("Check the details below", fieldErrorsFrom(parsed.error));
    }

    const state = await readState();
    // Deliberately vague: do not reveal whether the email exists.
    const invalid = err<SessionUser>("Email or password is incorrect");
    if (!state || state.user.email !== parsed.data.email) return invalid;
    if (state.user.passwordHash !== (await hashPassword(parsed.data.password))) {
      return invalid;
    }

    await writeState({ ...state, authenticated: true });
    return ok({ id: state.user.id, email: state.user.email });
  },

  async signOut(): Promise<void> {
    const state = await readState();
    // Keep the account and its orders, drop only the session, so that
    // sign-out → sign-in is a testable round trip.
    if (state) await writeState({ ...state, authenticated: false });
  },

  async getCurrentUser(): Promise<SessionUser | null> {
    const state = await currentState();
    return state ? { id: state.user.id, email: state.user.email } : null;
  },

  async updatePassword(nextPassword): Promise<Result<void>> {
    const state = await currentState();
    if (!state) return err(NOT_SIGNED_IN);

    const parsed = passwordSchema.safeParse(nextPassword);
    if (!parsed.success) {
      return err("Check the details below", { password: parsed.error.issues[0].message });
    }

    await writeState({
      ...state,
      user: { ...state.user, passwordHash: await hashPassword(parsed.data) },
    });
    return ok(undefined);
  },

  // -------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------

  async listOrders(query: OrderQuery = {}): Promise<Page<Order>> {
    const state = await currentState();
    if (!state) {
      const page = Math.max(1, query.page ?? 1);
      const perPage = Math.min(100, Math.max(1, query.perPage ?? DEFAULT_PER_PAGE));
      return { rows: [], total: 0, page, perPage, pageCount: 0 };
    }
    return applyOrderQuery(allOrders(state), query);
  },

  async getOrder(id): Promise<Order | null> {
    const state = await currentState();
    if (!state) return null;
    // Scoped to this user's own orders, so another user's id simply misses.
    // Same invariant RLS enforces in Supabase mode.
    return allOrders(state).find((o) => o.id === id) ?? null;
  },

  async getOrderEvents(orderId): Promise<OrderEvent[]> {
    const state = await currentState();
    if (!state) return [];
    // Check ownership first: an unowned id must return nothing rather than
    // leaking that the order exists.
    if (!allOrders(state).some((o) => o.id === orderId)) return [];
    return allEvents(state).filter((e) => e.orderId === orderId);
  },

  async createOrder(input: NewOrderInput): Promise<Result<Order>> {
    const state = await currentState();
    if (!state) return err(NOT_SIGNED_IN);

    const parsed = newOrderSchema.safeParse(input);
    if (!parsed.success) {
      return err("Check the details below", fieldErrorsFrom(parsed.error));
    }

    const existing = allOrders(state);
    const now = new Date().toISOString();
    const order: Order = {
      id: crypto.randomUUID(),
      orderNumber: Math.max(...existing.map((o) => o.orderNumber), 1000) + 1,
      userId: state.user.id,
      title: parsed.data.title,
      brief: parsed.data.brief,
      keywords: parsed.data.keywords,
      format: parsed.data.format,
      wordCount: parsed.data.wordCount,
      deadline: parsed.data.deadline,
      // Clients choose none of the next three. Postgres enforces the same rule
      // with a WITH CHECK clause on the INSERT policy.
      status: INITIAL_STATUS,
      priority: DEFAULT_PRIORITY,
      assignees: [],
      deliverable: null,
      createdAt: now,
      updatedAt: now,
    };

    await writeState({ ...state, orders: [...state.orders, order] });
    return ok(order);
  },

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  async getDashboardStats(): Promise<DashboardStats> {
    const state = await currentState();
    if (!state) return computeDashboardStats([], []);
    const delivered = allEvents(state)
      .filter((e) => e.kind === "delivered")
      .map((e) => e.createdAt);
    return computeDashboardStats(allOrders(state), delivered);
  },

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  async listNotifications(): Promise<Notification[]> {
    const state = await currentState();
    return state ? allNotifications(state) : [];
  },

  async unreadNotificationCount(): Promise<number> {
    const state = await currentState();
    if (!state) return 0;
    return allNotifications(state).filter((n) => n.readAt === null).length;
  },

  async markAllNotificationsRead(): Promise<Result<void>> {
    const state = await currentState();
    if (!state) return err(NOT_SIGNED_IN);
    await writeState({ ...state, notificationsReadAt: new Date().toISOString() });
    return ok(undefined);
  },

  // -------------------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------------------

  async getProfile(): Promise<Profile | null> {
    const state = await currentState();
    return state ? toProfile(state) : null;
  },

  async updateProfile(patch: ProfilePatch): Promise<Result<Profile>> {
    const state = await currentState();
    if (!state) return err(NOT_SIGNED_IN);

    const parsed = profilePatchSchema.safeParse(patch);
    if (!parsed.success) {
      return err("Check the details below", fieldErrorsFrom(parsed.error));
    }

    const next: MockState = {
      ...state,
      profile: {
        ...state.profile,
        ...(parsed.data.fullName !== undefined && { fullName: parsed.data.fullName }),
        ...(parsed.data.company !== undefined && { company: parsed.data.company }),
        ...(parsed.data.avatarUrl !== undefined && { avatarUrl: parsed.data.avatarUrl }),
        ...(parsed.data.preferences !== undefined && {
          preferences: parsed.data.preferences,
        }),
      },
    };

    await writeState(next);
    return ok(toProfile(next));
  },
};
