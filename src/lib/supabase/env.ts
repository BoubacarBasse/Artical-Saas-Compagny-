/**
 * Supabase configuration, read lazily.
 *
 * Lazily on purpose: in mock mode these variables are absent and nothing should
 * blow up at import time. They are only required once someone actually sets
 * DATA_SOURCE=supabase, and then the error says exactly what is missing.
 */

export function supabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set. It is required when " +
        "DATA_SOURCE=supabase. Copy it from Project Settings → API in the " +
        "Supabase dashboard. (Set DATA_SOURCE=mock to run without a database.)",
    );
  }
  return value;
}

export function supabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. It is required when " +
        "DATA_SOURCE=supabase. Use the anon/publishable key — never the " +
        "service_role key, which bypasses Row Level Security.",
    );
  }
  return value;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
