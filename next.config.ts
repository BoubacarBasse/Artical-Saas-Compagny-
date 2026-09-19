import type { NextConfig } from "next";

/**
 * Response headers.
 *
 * These are the controls a browser will enforce for us but only if we ask.
 * They are cheap, they are set in one place, and none of them depend on
 * remembering to do something on every page.
 *
 * A note on honesty about the CSP below: `script-src` carries 'unsafe-inline',
 * because the App Router streams its hydration payload in inline <script> tags
 * and they have no nonce unless middleware mints one per request. So this
 * policy does NOT stop an injected inline script. What it does do is real
 * anyway — it stops script being loaded from any other origin, refuses to be
 * framed, pins where forms may submit, and forbids plugins and <base>
 * rewriting. Nonce-based CSP is the upgrade; it belongs with the middleware,
 * not here.
 */

const isDev = process.env.NODE_ENV !== "production";

/** The Data API origin has to be reachable, so name it rather than opening up
 *  connect-src. Absent in mock mode, where the app talks to nobody. */
const supabaseOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
})();

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseOrigin.replace(/^http/, "ws")}` : ""}${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /** Naming the framework in every response is a free hint to a scanner. */
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // frame-ancestors covers this for modern browsers; kept for the ones
          // that still only understand the old header.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Ignored over plain http, so it costs nothing locally and matters
          // the moment this is behind a real certificate.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
