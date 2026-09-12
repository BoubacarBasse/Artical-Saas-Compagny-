import { expect, test } from "@playwright/test";
import {
  DEFAULT_PREFERENCES,
  credentialsSchema,
  fieldErrorsFrom,
  keywordsSchema,
  newOrderSchema,
  parseOrderQuery,
  parsePreferences,
  profilePatchSchema,
  updatePasswordSchema,
} from "@/lib/data/schemas";

test.describe("credentials", () => {
  test("requires a real email and an 8-character password", () => {
    expect(credentialsSchema.safeParse({ email: "nope", password: "abcdefgh" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "abcdefgh" }).success).toBe(true);
  });

  test("password confirmation must match, and the error lands on the right field", () => {
    const result = updatePasswordSchema.safeParse({
      password: "abcdefgh",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    expect(fieldErrorsFrom(result.error!)).toHaveProperty("confirmPassword");
  });
});

test.describe("keywords", () => {
  test("splits a comma-separated field the way the brief displays it", () => {
    expect(keywordsSchema.parse("saas retention, churn rate")).toEqual([
      "saas retention",
      "churn rate",
    ]);
  });

  test("trims, lowercases, drops blanks and de-duplicates", () => {
    expect(keywordsSchema.parse("  SEO , seo,, Content  ")).toEqual(["seo", "content"]);
  });

  test("treats empty, null and undefined as no keywords", () => {
    expect(keywordsSchema.parse("")).toEqual([]);
    expect(keywordsSchema.parse(null)).toEqual([]);
    expect(keywordsSchema.parse(undefined)).toEqual([]);
  });

  test("accepts an array as well as a string", () => {
    expect(keywordsSchema.parse(["One", "two"])).toEqual(["one", "two"]);
  });

  test("caps the count", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `k${i}`).join(",");
    expect(keywordsSchema.safeParse(eleven).success).toBe(false);
  });
});

test.describe("new order", () => {
  const valid = {
    title: "A perfectly good title",
    brief: "Something descriptive enough to be useful.",
    keywords: "saas retention, churn rate",
    format: "whitepaper",
    wordCount: 1200,
    deadline: "2026-12-01",
  };

  test("accepts a well-formed order", () => {
    const parsed = newOrderSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    expect(parsed.data!.keywords).toEqual(["saas retention", "churn rate"]);
  });

  test("requires a real format", () => {
    expect(newOrderSchema.safeParse({ ...valid, format: "poem" }).success).toBe(false);
    expect(newOrderSchema.safeParse({ ...valid, format: undefined }).success).toBe(false);
  });

  test("rejects a title that is too short or too long", () => {
    expect(newOrderSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
    expect(newOrderSchema.safeParse({ ...valid, title: "x".repeat(121) }).success).toBe(false);
  });

  test("rejects word counts outside the orderable range", () => {
    expect(newOrderSchema.safeParse({ ...valid, wordCount: 99 }).success).toBe(false);
    expect(newOrderSchema.safeParse({ ...valid, wordCount: 10001 }).success).toBe(false);
    expect(newOrderSchema.safeParse({ ...valid, wordCount: 1200.5 }).success).toBe(false);
  });

  test("normalises an empty date input to null", () => {
    // <input type="date"> submits "" when left blank, not null.
    expect(newOrderSchema.parse({ ...valid, deadline: "" }).deadline).toBeNull();
    expect(newOrderSchema.parse({ ...valid, deadline: null }).deadline).toBeNull();
  });

  test("rejects a malformed date", () => {
    expect(newOrderSchema.safeParse({ ...valid, deadline: "01/12/2026" }).success).toBe(false);
  });

  test("offers no way to set status, priority or assignees", () => {
    // Those are staff fields. Postgres enforces the same rule twice: no client
    // UPDATE policy on orders, and a column-level INSERT grant that does not
    // include them.
    const parsed = newOrderSchema.parse({
      ...valid,
      status: "completed",
      priority: "high",
      assignees: [{ name: "Nobody" }],
      orderNumber: 9999,
    } as never);
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("priority");
    expect(parsed).not.toHaveProperty("assignees");
    expect(parsed).not.toHaveProperty("orderNumber");
  });
});

test.describe("preferences", () => {
  test("an empty or missing blob degrades to defaults", () => {
    expect(parsePreferences({})).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  test("garbage degrades to defaults rather than crashing a page", () => {
    // The jsonb column is schemaless, so this is the guard that makes it safe.
    expect(parsePreferences("not an object")).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(42)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({ notifications: "yes please" })).toEqual(DEFAULT_PREFERENCES);
  });

  test("a partial blob keeps what is valid and fills the rest", () => {
    const parsed = parsePreferences({ notifications: { weeklySummary: true } });
    expect(parsed.notifications.weeklySummary).toBe(true);
    expect(parsed.notifications.statusChange).toBe(true);
    expect(parsed.orderDefaults).toEqual(DEFAULT_PREFERENCES.orderDefaults);
  });

  test("order defaults respect the same bounds as a real order", () => {
    expect(parsePreferences({ orderDefaults: { wordCount: 50 } })).toEqual(DEFAULT_PREFERENCES);
    expect(
      parsePreferences({ orderDefaults: { wordCount: 1500, format: "case_study" } })
        .orderDefaults.wordCount,
    ).toBe(1500);
    expect(parsePreferences({ orderDefaults: { format: "poem" } })).toEqual(DEFAULT_PREFERENCES);
  });
});

test.describe("profile patch", () => {
  test("accepts partial updates and nulls", () => {
    expect(profilePatchSchema.safeParse({ fullName: "Ada" }).success).toBe(true);
    expect(profilePatchSchema.safeParse({ company: null }).success).toBe(true);
    expect(profilePatchSchema.safeParse({}).success).toBe(true);
  });

  test("rejects a malformed avatar URL", () => {
    expect(profilePatchSchema.safeParse({ avatarUrl: "not-a-url" }).success).toBe(false);
  });

  test("offers no way to change email or id", () => {
    // Locked at the database level too, with column-level grants.
    const parsed = profilePatchSchema.parse({
      fullName: "Ada",
      email: "attacker@example.com",
      id: "someone-else",
    } as never);
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("id");
  });
});

test.describe("query parsing", () => {
  test("reads a full query string", () => {
    const parsed = parseOrderQuery(
      new URLSearchParams(
        "search=cloud&statuses=in_progress,pending_review&sort=title_asc&page=2",
      ),
    );
    expect(parsed.search).toBe("cloud");
    expect(parsed.statuses).toEqual(["in_progress", "pending_review"]);
    expect(parsed.sort).toBe("title_asc");
    expect(parsed.page).toBe(2);
  });

  test("silently drops values that are not real statuses", () => {
    expect(parseOrderQuery(new URLSearchParams("statuses=in_progress,nonsense")).statuses)
      .toEqual(["in_progress"]);
  });

  test("falls back to a safe default rather than throwing on junk", () => {
    const parsed = parseOrderQuery({ page: "banana", sort: "by_vibes" });
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBeUndefined();
  });

  test("handles an empty query", () => {
    expect(parseOrderQuery(new URLSearchParams("")).statuses).toBeUndefined();
  });
});
