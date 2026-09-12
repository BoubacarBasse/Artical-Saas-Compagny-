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
  type DataProvider,
  type NewOrderInput,
  type Order,
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
import { INITIAL_STAGE, type OrderStage } from "@/lib/orders/stages";
import { createClient } from "@/lib/supabase/server";

const NOT_SIGNED_IN = "You need to be signed in to do that";

interface OrderRow {
  id: string;
  user_id: string;
  title: string;
  brief: string;
  word_count: number;
  deadline: string | null;
  stage: OrderStage;
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

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    brief: row.brief,
    wordCount: row.word_count,
    deadline: row.deadline,
    stage: row.stage,
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
 * shape of the query rather than just its value. Strip the structural
 * characters before interpolating.
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

    // Deliberately vague, and matching the mock provider's wording exactly so
    // the contract suite can assert one string against both implementations.
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
      return err("Check the details below", {
        password: parsed.error.issues[0].message,
      });
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

    if (query.stages?.length) {
      builder = builder.in("stage", query.stages);
    }

    // Null deadlines sort last in both directions — "whenever" is never the
    // most urgent thing on the list. Mirrors the mock provider's comparator.
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

    const total = count ?? 0;
    return {
      rows: (data ?? []).map((row) => toOrder(row as OrderRow)),
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
    // That is the correct behaviour: it leaks nothing about what exists.
    if (error) return null;
    return data ? toOrder(data as OrderRow) : null;
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
        word_count: parsed.data.wordCount,
        deadline: parsed.data.deadline,
        // Stated explicitly even though the column defaults to it: the INSERT
        // policy's WITH CHECK clause requires this exact value, so a client
        // cannot create an order that is already marked delivered.
        stage: INITIAL_STAGE,
      })
      .select()
      .single();

    if (error) return err(`Could not create that order: ${error.message}`);
    return ok(toOrder(data as OrderRow));
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
    if (parsed.data.preferences !== undefined) {
      update.preferences = parsed.data.preferences;
    }

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
