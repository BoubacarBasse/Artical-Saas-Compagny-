/**
 * ---------------------------------------------------------------------------
 * THE SWAP POINT
 * ---------------------------------------------------------------------------
 * This is the only file in the application that names either implementation.
 * Pages, layouts and Server Actions import `data` from here and nothing else.
 * Swapping the entire backend is one environment variable:
 *
 *     DATA_SOURCE=mock        cookie-backed demo data, no database
 *     DATA_SOURCE=supabase    real Postgres + Supabase Auth
 *
 * If flipping that variable ever requires editing a page, the abstraction has
 * sprung a leak and that leak is the bug to fix — not the page.
 *
 * `DATA_SOURCE` is deliberately not prefixed NEXT_PUBLIC_. Every data call
 * happens in a Server Component or Server Action, so neither implementation is
 * ever bundled into client-side JavaScript.
 */

import type { DataProvider } from "./types";
import { mockProvider } from "./mock/provider";
import { supabaseProvider } from "./supabase/provider";

export const DATA_SOURCE = process.env.DATA_SOURCE === "supabase" ? "supabase" : "mock";

export const data: DataProvider =
  DATA_SOURCE === "supabase" ? supabaseProvider : mockProvider;

/** Drives the "Demo mode" banner. Mock data is a fixture, never a real vault. */
export const isMockMode = DATA_SOURCE === "mock";

export * from "./types";
