/**
 * Supabase implementation of DataProvider.
 *
 * Every method resolves the caller from the session and scopes its query with
 * an explicit `eq("user_id", user.id)`. That is belt-and-braces: Row Level
 * Security already makes another user's rows invisible. The explicit filter is
 * there so the query reads the same way as the mock provider and so a
 * misconfigured policy fails closed rather than silently leaking.
 */

import {
  DEFAULT_PER_PAGE,
  err,
  ok,
  type DashboardStats,
  type DataProvider,
  type Deliverable,
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
  credentialsSchema,
  fieldErrorsFrom,
  newOrderSchema,
  parsePreferences,
  passwordSchema,
  profilePatchSchema,
} from "../schemas";
import type {
  OrderFormat,
  OrderPriority,
  OrderStatus,
} from "@/lib/orders/statuses";
import { computeDashboardStats } from "@/lib/orders/stats";
import { createClient } from "@/lib/supabase/server";

const NOT_SIGNED_IN = "You need to be signed in to do that";

/** Bucket holding finished pieces. Private; access is via short-lived URLs. */
const DELIVERABLES_BUCKET = "deliverables";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface StoredDeliverable {
  filename: string;
  path: string;
  uploadedAt: string;
}

interface OrderRow {
  id: string;
  order_number: number;
  user_id: string;
  title: string;
  brief: string;
  keywords: string[] | null;
  format: OrderFormat;
  word_count: number;
  deadline: string | null;
  status: OrderStatus;
  priority: OrderPriority;
  assignees: unknown;
  deliverable: StoredDeliverable | null;
  created_at: string;
  updated_at: string;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  avatar_url: string | null;
  preferences: unknown;
  created_at: string;
}

function toAssignees(value: unknown): Order["assignees"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((a): a is Record<string, unknown> => typeof a === "object" && a !== null)
    .map((a) => ({
      name: typeof a.name === "string" ? a.name : "Unknown",
      avatarUrl: typeof a.avatarUrl === "string" ? a.avatarUrl : null,
    }));
}

function toOrder(row: OrderRow, deliverable: Deliverable | null): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id,
    title: row.title,
    brief: row.brief,
    keywords: row.keywords ?? [],
    format: row.format,
    wordCount: row.word_count,
    deadline: row.deadline,
    status: row.status,
    priority: row.priority,
    assignees: toAssignees(row.assignees),
    deliverable,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    company: row.company,
    avatarUrl: row.avatar_url,
    preferences: parsePreferences(row.preferences),
    createdAt: row.created_at,
  };
}

/**
 * PostgREST's `or()` filter is a comma-separated string, and `ilike` treats `%`
 * and `_` as wildcards. An unescaped search term could therefore change the
 * shape of the query rather than just its value. Strip structural characters.
 */
function sanitiseSearch(input: string): string {
  return input.replace(/[,()%_*\\]/g, " ").trim();
}

export const supabaseProvider: DataProvider = {
  name: "supabase",

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  async signUp(email, password): Promise<Result<SessionUser>> {
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      return err("Check the details below", fieldErrorsFrom(parsed.error));
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error) return err(error.message);
    if (!data.user) return err("Could not create that account");

    if (!data.session) {
      // Supabase enables email confirmation by default. v1 has no confirmation
      // UI, so the account exists but cannot sign in yet. Say so plainly rather
      // than redirecting to a dashboard that will bounce them straight back.
      return err(
        "Account created. Check your email to confirm it before signing in. " +
          "(To skip this step, turn off 'Confirm email' under " +
          "Authentication → Providers → Email in the Supabase dashboard.)",
      );
    }

    return ok({ id: data.user.id, email: data.user.email ?? parsed.data.email });
  },

  async signIn(email, password): Promise<Result<SessionUser>> {
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      return err("Check the details below", fieldErrorsFrom(parsed.error));
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    // Deliberately vague, and worded identically to the mock provider so the
    // contract suite can assert one string against both implementations.
    if (error || !data.user) return err("Email or password is incorrect");

    return ok({ id: data.user.id, email: data.user.email ?? parsed.data.email });
  },

  async signOut(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<SessionUser | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email ?? "" } : null;
  },

  async updatePassword(nextPassword): Promise<Result<void>> {
    const parsed = passwordSchema.safeParse(nextPassword);
    if (!parsed.success) {
      return err("Check the details below", { password: parsed.error.issues[0].message });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err(NOT_SIGNED_IN);

    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    if (error) return err(error.message);
    return ok(undefined);
  },

  // -------------------------------------------------------------------------
  // Orders
  // -------------------------------------------------------------------------

  async listOrders(query: OrderQuery = {}): Promise<Page<Order>> {
    const page = Math.max(1, query.page ?? 1);
    const perPage = Math.min(100, Math.max(1, query.perPage ?? DEFAULT_PER_PAGE));

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { rows: [], total: 0, page, perPage, pageCount: 0 };

    let builder = supabase
      .from("orders")
      .select("*", { count: "exact" })
      .eq("user_id", user.id);

    const needle = query.search ? sanitiseSearch(query.search) : "";
    if (needle) {
      builder = builder.or(`title.ilike.%${needle}%,brief.ilike.%${needle}%`);
    }

    if (query.statuses?.length) {
      builder = builder.in("status", query.statuses);
    }

    // Null deadlines sort last in both directions, mirroring the mock's
    // comparator.
    switch (query.sort ?? "created_desc") {
      case "created_asc":
        builder = builder.order("created_at", { ascending: true });
        break;
      case "deadline_asc":
        builder = builder.order("deadline", { ascending: true, nullsFirst: false });
        break;
      case "deadline_desc":
        builder = builder.order("deadline", { ascending: false, nullsFirst: false });
        break;
      case "title_asc":
        builder = builder.order("title", { ascending: true });
        break;
      case "created_desc":
      default:
        builder = builder.order("created_at", { ascending: false });
        break;
    }

    const from = (page - 1) * perPage;
    const { data, count, error } = await builder.range(from, from + perPage - 1);
    if (error) throw new Error(`Could not load orders: ${error.message}`);

    // Deliberately no signed URLs here. Minting one per row would mean a
    // storage round trip for every list render, and nothing on a list view
    // downloads a file — the detail page does that.
    const total = count ?? 0;
    return {
      rows: (data ?? []).map((row) => toOrder(row as OrderRow, null)),
      total,
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(total / perPage)),
    };
  },

  async getOrder(id): Promise<Order | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    // Another user's id returns no row rather than an error — RLS makes it
    // invisible, so "not yours" and "does not exist" are indistinguishable.
    // That is correct: it leaks nothing about what exists.
    if (error || !data) return null;

    const row = data as OrderRow;
    let deliverable: Deliverable | null = null;

    if (row.deliverable?.path) {
      // The bucket is private. A short-lived signed URL means the download link
      // cannot be forwarded to someone who is not entitled to the file.
      const { data: signed } = await supabase.storage
        .from(DELIVERABLES_BUCKET)
        .createSignedUrl(row.deliverable.path, SIGNED_URL_TTL_SECONDS);
      if (signed?.signedUrl) {
        deliverable = {
          filename: row.deliverable.filename,
          url: signed.signedUrl,
          uploadedAt: row.deliverable.uploadedAt,
        };
      }
    }

    return toOrder(row, deliverable);
  },

  async getOrderEvents(orderId): Promise<OrderEvent[]> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // RLS on order_events checks ownership through the parent order, so an
    // unowned id returns an empty list rather than leaking its existence.
    const { data, error } = await supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id as string,
      orderId: row.order_id as string,
      kind: row.kind as OrderEvent["kind"],
      label: row.label as string,
      createdAt: row.created_at as string,
    }));
  },

  async createOrder(input: NewOrderInput): Promise<Result<Order>> {
    const parsed = newOrderSchema.safeParse(input);
    if (!parsed.success) {
      return err("Check the details below", fieldErrorsFrom(parsed.error));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err(NOT_SIGNED_IN);

    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        brief: parsed.data.brief,
        keywords: parsed.data.keywords,
        format: parsed.data.format,
        word_count: parsed.data.wordCount,
        deadline: parsed.data.deadline,
        // `status`, `priority`, `assignees`, `deliverable` and `order_number`
        // are deliberately absent. A column-level INSERT grant means the
        // authenticated role cannot even name them, so naming them here would
        // make the insert fail. Column defaults and the sequence fill them in,
        // and the INSERT policy's WITH CHECK re-asserts status = 'draft'.
      })
      .select()
      .single();

    if (error) return err(`Could not create that order: ${error.message}`);
    return ok(toOrder(data as OrderRow, null));
  },

  // -------------------------------------------------------------------------
  // Dashboard
  // -------------------------------------------------------------------------

  async getDashboardStats(): Promise<DashboardStats> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return computeDashboardStats([], []);

    // One client's order history is small — tens of rows, not thousands — so
    // counting in the application is cheaper than seven round trips for seven
    // monthly buckets. Revisit if an account ever grows past a few hundred.
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id);
    if (error) throw new Error(`Could not load dashboard: ${error.message}`);

    const { data: delivered } = await supabase
      .from("order_events")
      .select("created_at")
      .eq("kind", "delivered");

    return computeDashboardStats(
      (orders ?? []).map((row) => toOrder(row as OrderRow, null)),
      (delivered ?? []).map((e) => e.created_at as string),
    );
  },

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------

  async listNotifications(): Promise<Notification[]> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []).map((row) => ({
      id: row.id as string,
      kind: row.kind as Notification["kind"],
      title: row.title as string,
      orderId: (row.order_id as string | null) ?? null,
      createdAt: row.created_at as string,
      readAt: (row.read_at as string | null) ?? null,
    }));
  },

  async unreadNotificationCount(): Promise<number> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    return count ?? 0;
  },

  async markAllNotificationsRead(): Promise<Result<void>> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err(NOT_SIGNED_IN);

    // `read_at` is the only column a client may update on this table — enforced
    // by a column-level grant, not just by the row policy.
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) return err(`Could not update your notifications: ${error.message}`);
    return ok(undefined);
  },

  // -------------------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------------------

  async getProfile(): Promise<Profile | null> {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) return null;
    return toProfile(data as ProfileRow);
  },

  async updateProfile(patch: ProfilePatch): Promise<Result<Profile>> {
    const parsed = profilePatchSchema.safeParse(patch);
    if (!parsed.success) {
      return err("Check the details below", fieldErrorsFrom(parsed.error));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return err(NOT_SIGNED_IN);

    const update: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) update.full_name = parsed.data.fullName;
    if (parsed.data.company !== undefined) update.company = parsed.data.company;
    if (parsed.data.avatarUrl !== undefined) update.avatar_url = parsed.data.avatarUrl;
    if (parsed.data.preferences !== undefined) update.preferences = parsed.data.preferences;

    const { data, error } = await supabase
      .from("profiles")
      .update(update)
      .eq("id", user.id)
      .select()
      .single();

    if (error) return err(`Could not save your settings: ${error.message}`);
    return ok(toProfile(data as ProfileRow));
  },
};
