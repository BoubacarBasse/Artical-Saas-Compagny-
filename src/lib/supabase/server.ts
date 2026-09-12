/**
 * Server-side Supabase client, backed by cookies.
 *
 * Cookie-based sessions matter architecturally: the user's JWT travels with
 * every query, so Postgres evaluates Row Level Security as that user. RLS is
 * then the actual enforcement layer rather than application-level filtering we
 * have to remember to apply on every call.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

export async function createClient() {
  const jar = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            jar.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: middleware refreshes the session on every request,
          // so the tokens are kept current there instead.
        }
      },
    },
  });
}
