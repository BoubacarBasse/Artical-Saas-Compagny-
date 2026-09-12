import { expect, test } from "@playwright/test";
import {
  DEFAULT_PREFERENCES,
  credentialsSchema,
  fieldErrorsFrom,
  newOrderSchema,
  parseOrderQuery,
  parsePreferences,
  profilePatchSchema,
  updatePasswordSchema,
} from "@/lib/data/schemas";

test.describe("credentials", () => {
  test("requires a real email and an 8-character password", () => {
    expect(credentialsSchema.safeParse({ email: "nope", password: "abcdefgh" }).success)
      .toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "short" }).success)
      .toBe(false);
    expect(credentialsSchema.safeParse({ email: "a@b.co", password: "abcdefgh" }).success)
      .toBe(true);
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

test.describe("new order", () => {
  const valid = {
    title: "A perfectly good title",
    brief: "Something descriptive enough to be useful.",
    wordCount: 1200,
    deadline: "2026-12-01",
  };

  test("accepts a well-formed order", () => {
    expect(newOrderSchema.safeParse(valid).success).toBe(true);
  });

  test("rejects a title that is too short or too long", () => {
    expect(newOrderSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
    expect(newOrderSchema.safeParse({ ...valid, title: "x".repeat(121) }).success)
      .toBe(false);
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
    expect(newOrderSchema.parse({ ...valid, deadline: "  " }).deadline).toBeNull();
  });

  test("rejects a malformed date", () => {
    expect(newOrderSchema.safeParse({ ...valid, deadline: "01/12/2026" }).success)
      .toBe(false);
  });

  test("trims whitespace off text fields", () => {
    const parsed = newOrderSchema.parse({ ...valid, title: "  Padded title  " });
    expect(parsed.title).toBe("Padded title");
  });

  test("there is no way to set a stage through this schema", () => {
    // Clients never choose a stage. Postgres enforces the same rule with a
    // WITH CHECK clause on the orders INSERT policy.
    const parsed = newOrderSchema.parse({ ...valid, stage: "delivered" } as never);
    expect(parsed).not.toHaveProperty("stage");
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
    expect(parsePreferences({ orderDefaults: { wordCount: 50 } }))
      .toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences({ orderDefaults: { wordCount: 1500 } }).orderDefaults.wordCount)
      .toBe(1500);
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
    // Those are locked at the database level too, with column-level grants.
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
      new URLSearchParams("search=cloud&stages=writing,review&sort=title_asc&page=2"),
    );
    expect(parsed.search).toBe("cloud");
    expect(parsed.stages).toEqual(["writing", "review"]);
    expect(parsed.sort).toBe("title_asc");
    expect(parsed.page).toBe(2);
  });

  test("silently drops stage values that are not real stages", () => {
    const parsed = parseOrderQuery(new URLSearchParams("stages=writing,nonsense"));
    expect(parsed.stages).toEqual(["writing"]);
  });

  test("falls back to a safe default rather than throwing on junk", () => {
    const parsed = parseOrderQuery({ page: "banana", sort: "by_vibes" });
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBeUndefined();
  });

  test("handles an empty query", () => {
    expect(parseOrderQuery(new URLSearchParams("")).stages).toBeUndefined();
  });
});
