import { expect, test } from "@playwright/test";
import {
  decodeState,
  encodeState,
  hashPassword,
  type MockState,
} from "@/lib/data/mock/state";
import { DEFAULT_PREFERENCES } from "@/lib/data/schemas";
import { makeOrder } from "./fixtures";

function baseState(overrides: Partial<MockState> = {}): MockState {
  return {
    user: { id: "user-1", email: "someone@example.com", passwordHash: "hash" },
    profile: {
      fullName: null,
      company: null,
      avatarUrl: null,
      preferences: DEFAULT_PREFERENCES,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    orders: [],
    authenticated: true,
    ...overrides,
  };
}

test.describe("mock cookie codec", () => {
  test("round-trips a state through encode and decode", async () => {
    const state = baseState({ orders: [makeOrder({ title: "Round trip" })] });
    const decoded = await decodeState(await encodeState(state));
    expect(decoded).toEqual(state);
  });

  test("survives non-ASCII content", async () => {
    const state = baseState({
      orders: [makeOrder({ title: "Café — naïve résumé · 日本語" })],
    });
    const decoded = await decodeState(await encodeState(state));
    expect(decoded?.orders[0].title).toBe("Café — naïve résumé · 日本語");
  });

  test("rejects a tampered payload", async () => {
    // The whole point of signing: someone editing the cookie in devtools to
    // promote their own order should get signed out, not a modified session.
    const encoded = await encodeState(baseState());
    const [payload, signature] = encoded.split(".");
    const tampered = `${payload.slice(0, -4)}AAAA.${signature}`;
    expect(await decodeState(tampered)).toBeNull();
  });

  test("rejects a tampered signature", async () => {
    const encoded = await encodeState(baseState());
    const [payload, signature] = encoded.split(".");
    expect(await decodeState(`${payload}.${signature.slice(0, -2)}xy`)).toBeNull();
  });

  test("rejects missing, empty and unsigned values", async () => {
    expect(await decodeState(undefined)).toBeNull();
    expect(await decodeState("")).toBeNull();
    expect(await decodeState("not-signed-at-all")).toBeNull();
  });

  test("evicts the oldest orders when the cookie would overflow", async () => {
    // Cookies cap at ~4KB. Rather than throwing, the codec sheds the oldest
    // user-created orders until the payload fits.
    const orders = Array.from({ length: 40 }, (_, i) =>
      makeOrder({
        id: `order-${i}`,
        title: `Order number ${i}`,
        brief: "x".repeat(400),
        createdAt: new Date(2026, 0, i + 1).toISOString(),
      }),
    );

    const encoded = await encodeState(baseState({ orders }));
    expect(encoded.length).toBeLessThanOrEqual(3500);

    const decoded = await decodeState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.orders.length).toBeLessThan(orders.length);
    // Newest survive: the last order in is still there.
    expect(decoded!.orders.at(-1)!.id).toBe("order-39");
  });

  test("truncates rather than loops when a single order is too large", async () => {
    const huge = makeOrder({ brief: "y".repeat(6000) });
    const decoded = await decodeState(await encodeState(baseState({ orders: [huge] })));
    expect(decoded).not.toBeNull();
    expect(decoded!.orders).toHaveLength(1);
    expect(decoded!.orders[0].brief).toContain("truncated in demo mode");
  });
});

test.describe("mock password hashing", () => {
  test("is deterministic and differs per password", async () => {
    expect(await hashPassword("correct horse")).toBe(await hashPassword("correct horse"));
    expect(await hashPassword("a")).not.toBe(await hashPassword("b"));
  });

  test("does not store the password in the clear", async () => {
    expect(await hashPassword("hunter2")).not.toContain("hunter2");
  });
});
