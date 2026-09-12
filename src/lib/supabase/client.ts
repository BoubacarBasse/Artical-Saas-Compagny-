/**
 * Browser Supabase client.
 *
 * Currently unused — every data path in this app runs through Server
 * Components and Server Actions, which is what keeps the provider
 * implementations out of the client bundle. Kept for Client Components that
 * need realtime subscriptions later.
 */

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
