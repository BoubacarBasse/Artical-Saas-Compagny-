/**
 * Serialisation, signing and verification for the mock demo cookie.
 *
 * Kept free of `next/headers` on purpose: middleware runs on the Edge runtime
 * and reads cookies off a NextRequest, while the provider runs in Node and uses
 * the headers API. Both need to decode the same payload, so the codec lives
 * here and each caller supplies its own raw cookie string.
 *
 * Everything uses Web Crypto rather than `node:crypto` for the same reason —
 * `node:crypto` is not available on the Edge runtime.
 *
 * ---------------------------------------------------------------------------
 * THIS IS A DEMO FIXTURE, NOT A SECURITY BOUNDARY.
 * ---------------------------------------------------------------------------
 * The signature stops the payload being hand-edited in devtools, which is all
 * it is for. Mock mode has no real authentication and no real authorisation.
 * The moment DATA_SOURCE=supabase, Postgres RLS becomes the enforcement layer
 * and none of this code runs.
 */

import type { Order, Preferences } from "../types";

export const MOCK_COOKIE = "asc_demo";

/** Cookies cap at ~4096 bytes including name and attributes. Leave headroom. */
const MAX_VALUE_BYTES = 3500;

export interface MockState {
  user: { id: string; email: string; passwordHash: string };
  profile: {
    fullName: string | null;
    company: string | null;
    avatarUrl: string | null;
    preferences: Preferences;
    createdAt: string;
  };
  /**
   * Only orders the user actually created. The seeded demo orders are a pure
   * function of the user id (see seed.ts) and are reconstructed on read, so
   * they cost zero cookie bytes.
   */
  orders: Order[];
  /** Sign-out keeps the account but drops the session, so sign-in is testable. */
  authenticated: boolean;
}

// ---------------------------------------------------------------------------
// base64url — btoa/atob exist on both runtimes; Buffer does not.
// ---------------------------------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Text goes through TextEncoder first so multi-byte characters survive.
 *
 * Raw digests must NOT take this path: `String.fromCharCode(...digest)` makes a
 * string whose code points are 0-255, and UTF-8 encoding that would inflate
 * every byte above 0x7F into two. It would still round-trip (both sides would
 * be wrong identically), but it would not be standard base64 and the cookie
 * would be needlessly long. Digests use bytesToBase64Url directly.
 */
function toBase64Url(input: string): string {
  return bytesToBase64Url(new TextEncoder().encode(input));
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ---------------------------------------------------------------------------
// HMAC
// ---------------------------------------------------------------------------

function secret(): string {
  return process.env.MOCK_SECRET || "dev-only-change-me";
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(payload),
  );
  return bytesToBase64Url(new Uint8Array(signature));
}

/** Length-safe, non-short-circuiting comparison. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Mock-only password hashing. Salted with the cookie secret. */
export async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${secret()}:${password}`),
  );
  return bytesToBase64Url(new Uint8Array(digest));
}

// ---------------------------------------------------------------------------
// Encode / decode
// ---------------------------------------------------------------------------

/**
 * Serialise, signing the payload. If the result would overflow the cookie, drop
 * the oldest user-created orders until it fits; if even a single order is too
 * large (a 5000-character brief will do it), truncate that brief for storage.
 * Both cases are demo-mode limitations and are noted in the returned state.
 */
export async function encodeState(state: MockState): Promise<string> {
  const working: MockState = { ...state, orders: [...state.orders] };

  for (;;) {
    const payload = toBase64Url(JSON.stringify(working));
    const signature = await sign(payload);
    const cookie = `${payload}.${signature}`;

    if (cookie.length <= MAX_VALUE_BYTES) return cookie;

    if (working.orders.length > 1) {
      working.orders.shift(); // oldest first
      continue;
    }
    if (working.orders.length === 1 && working.orders[0].brief.length > 200) {
      working.orders[0] = {
        ...working.orders[0],
        brief: `${working.orders[0].brief.slice(0, 200)}… (truncated in demo mode)`,
      };
      continue;
    }
    // Nothing left to shed — hand back what we have rather than loop forever.
    return cookie;
  }
}

export async function decodeState(raw: string | undefined): Promise<MockState | null> {
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);

  const expected = await sign(payload);
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const parsed = JSON.parse(fromBase64Url(payload)) as MockState;
    if (!parsed?.user?.id || !Array.isArray(parsed.orders)) return null;
    return parsed;
  } catch {
    return null;
  }
}
