/**
 * Route guard and session refresh.
 *
 * Runs for both data sources. In Supabase mode it also rotates the access token
 * on every request, which is why it has to run even on routes that are already
 * public.
 *
 * Middleware is a redirect, not a security boundary. It stops a signed-out
 * visitor seeing a dashboard shell; it is Row Level Security that stops anyone
 * reading data that is not theirs. Both exist, and they are not substitutes.
 *
 * Note this file runs on the Edge runtime, so it can only import the Edge-safe
 * half of the mock store (state.ts, which uses Web Crypto rather than
 * node:crypto).
 */

import { NextResponse, type NextRequest } from "next/server";
import { MOCK_COOKIE, decodeState } from "@/lib/data/mock/state";
import { updateSession } from "@/lib/supabase/middleware";

/** Everything under these prefixes requires a session. */
const PROTECTED_PREFIXES = ["/dashboard", "/orders", "/inbox", "/settings"];

/** Signing in again while already signed in just sends you to the dashboard. */
const AUTH_ROUTES = ["/login", "/signup"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function middleware(request: NextRequest) {
  const useSupabase = process.env.DATA_SOURCE === "supabase";

  let response = NextResponse.next({ request });
  let userId: string | null = null;

  if (useSupabase) {
    const result = await updateSession(request);
    response = result.response;
    userId = result.userId;
  } else {
    const state = await decodeState(request.cookies.get(MOCK_COOKIE)?.value);
    userId = state?.authenticated ? state.user.id : null;
  }

  const { pathname } = request.nextUrl;

  if (!userId && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Carry the destination so sign-in can return them where they were going.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (userId && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation. Written as an
     * exclusion so new routes are protected-by-default rather than needing to
     * be remembered here.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
