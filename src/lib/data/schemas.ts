/**
 * Validation at the app boundary.
 *
 * Every untrusted input crosses one of these schemas before it reaches a
 * provider: form submissions, URL search params, and — importantly — the
 * `preferences` jsonb column coming back out of Postgres. That column is
 * schemaless by design, so it is only safe because it is parsed here on the way
 * in *and* on the way out.
 */

import { z } from "zod";
import { ORDER_STAGES } from "@/lib/orders/stages";
import {
  DEFAULT_PER_PAGE,
  ORDER_SORTS,
  type Preferences,
} from "./types";

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------

export const emailSchema = z.email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/** Accepts "" from an empty <input type="date"> and normalises it to null. */
const optionalDate = z
  .union([z.string(), z.null()])
  .transform((v) => (v === null || v.trim() === "" ? null : v.trim()))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Enter a valid date",
  });

export const newOrderSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Give the article a title of at least 3 characters")
    .max(120, "Title must be 120 characters or fewer"),
  brief: z
    .string()
    .trim()
    .min(10, "Tell us a little more about what you need (10 characters minimum)")
    .max(5000, "Brief must be 5000 characters or fewer"),
  wordCount: z
    .number({ error: "Enter a word count" })
    .int("Word count must be a whole number")
    .min(100, "Minimum order is 100 words")
    .max(10000, "For more than 10,000 words, please contact us directly"),
  deadline: optionalDate,
});

/**
 * Note there is no schema for changing an order's stage, and no provider method
 * that would accept one. Clients cannot move their own orders through the
 * pipeline — that is staff-only work, enforced in Postgres by the absence of an
 * UPDATE policy on `orders`.
 */

// ---------------------------------------------------------------------------
// Query parsing
// ---------------------------------------------------------------------------

const stageList = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : v.split(",")))
  .transform((v) =>
    v
      .map((s) => s.trim())
      .filter((s): s is (typeof ORDER_STAGES)[number] =>
        (ORDER_STAGES as readonly string[]).includes(s),
      ),
  );

export const orderQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  stages: stageList.optional(),
  sort: z.enum(ORDER_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
});

/** Turn `?search=x&stages=writing,review&page=2` into a typed OrderQuery. */
export function parseOrderQuery(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
) {
  const raw =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : params;
  const parsed = orderQuerySchema.safeParse(raw);
  return parsed.success
    ? parsed.data
    : { page: 1, perPage: DEFAULT_PER_PAGE };
}

// ---------------------------------------------------------------------------
// Profile & preferences
// ---------------------------------------------------------------------------

export const DEFAULT_PREFERENCES: Preferences = {
  notifications: {
    statusChange: true,
    delivered: true,
    weeklySummary: false,
  },
  orderDefaults: {
    wordCount: null,
    tone: null,
    audience: null,
  },
};

/**
 * Every field has a default, so a malformed or partial jsonb blob degrades to
 * sensible values instead of crashing a page. Use `parsePreferences` rather
 * than trusting the column directly.
 */
export const preferencesSchema = z.object({
  notifications: z
    .object({
      statusChange: z.boolean().default(true),
      delivered: z.boolean().default(true),
      weeklySummary: z.boolean().default(false),
    })
    .default(DEFAULT_PREFERENCES.notifications),
  orderDefaults: z
    .object({
      wordCount: z.number().int().min(100).max(10000).nullable().default(null),
      tone: z.string().trim().max(80).nullable().default(null),
      audience: z.string().trim().max(160).nullable().default(null),
    })
    .default(DEFAULT_PREFERENCES.orderDefaults),
});

export function parsePreferences(value: unknown): Preferences {
  const parsed = preferencesSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}

export const profilePatchSchema = z.object({
  fullName: z.string().trim().max(120).nullable().optional(),
  company: z.string().trim().max(120).nullable().optional(),
  avatarUrl: z.url("Enter a valid URL").nullable().optional(),
  preferences: preferencesSchema.optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten a ZodError into the `fieldErrors` shape our Result type carries. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
