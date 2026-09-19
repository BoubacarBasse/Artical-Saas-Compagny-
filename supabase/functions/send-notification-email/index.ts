/**
 * Email for a client-visible notification.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS LISTENS TO A TABLE RATHER THAN TO THE APP
 * ---------------------------------------------------------------------------
 * Migration 0002 already writes exactly one `notifications` row per thing worth
 * telling a client about. Sending email from here — a Database Webhook on that
 * table's INSERT — means the in-app inbox and the email are the same event, and
 * there is never a second definition of "what is worth an interruption" to keep
 * in sync with the first.
 *
 * It also has to be a webhook rather than a call from inside the trigger.
 * Emailing from the trigger would put an HTTP round trip inside the transaction
 * that changes an order's status, so a slow provider would slow down the table
 * editor and a failing one would roll the status change back. An order that did
 * not advance because an email bounced is a worse bug than an email that never
 * arrived.
 *
 * ---------------------------------------------------------------------------
 * SETUP (see context.md for the walk-through)
 * ---------------------------------------------------------------------------
 *   npx supabase secrets set RESEND_API_KEY=re_...
 *   npx supabase secrets set NOTIFY_WEBHOOK_SECRET=<a long random string>
 *   npx supabase secrets set APP_URL=http://localhost:3000
 *   npx supabase secrets set EMAIL_FROM="Article Orders <onboarding@resend.dev>"
 *   npx supabase functions deploy send-notification-email
 *
 * Then Dashboard -> Database -> Webhooks -> new webhook on `notifications`,
 * INSERT only, HTTP POST to this function, with the header
 * `x-webhook-secret: <the same string>`.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Mirrors DEFAULT_PREFERENCES in src/lib/data/schemas.ts. */
const DEFAULT_NOTIFICATION_PREFS = {
  statusChange: true,
  delivered: true,
  weeklySummary: false,
};

type NotificationKind = "order_update" | "order_complete" | "system";

interface NotificationRow {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  order_id: string | null;
  created_at: string;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: NotificationRow | null;
}

/**
 * Seeded and backfilled rows carry a `created_at` in the past. Without this
 * guard, running seed_hosted.sql after the webhook exists would fire five
 * emails about orders that "happened" months ago.
 */
const BACKFILL_CUTOFF_MS = 5 * 60 * 1000;

function wantsEmail(kind: NotificationKind, prefs: typeof DEFAULT_NOTIFICATION_PREFS): boolean {
  switch (kind) {
    case "order_complete":
      return prefs.delivered;
    case "order_update":
      return prefs.statusChange;
    case "system":
      // Account-level messages are not a marketing channel the client opted
      // into; they are things like "welcome". Always in-app, never emailed.
      return false;
  }
}

/**
 * The notification title carries an order title, and an order title is written
 * by the client. Interpolating it raw would let someone put markup — or an
 * `onerror` handler — into an email we send out under our own domain. It lands
 * in their own inbox today, but "the attacker is also the victim" is a property
 * of the current recipient list, not of this function, and a digest or a
 * CC to staff would quietly turn it into a real one.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmail(title: string, orderUrl: string | null): string {
  const safeTitle = escapeHtml(title);
  const button = orderUrl
    ? `<p style="margin:28px 0 0 0">
         <a href="${escapeHtml(orderUrl)}"
            style="display:inline-block;background:#b4502f;color:#ffffff;text-decoration:none;
                   padding:11px 18px;border-radius:7px;font-size:14px;font-weight:600">
           View the order
         </a>
       </p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f7f4f0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:#f7f4f0;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="max-width:520px;background:#fffefc;border:1px solid #e5dfd7;
                        border-radius:10px;padding:28px">
            <tr>
              <td style="font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;color:#1c1917">
                <p style="margin:0 0 20px 0;font-size:13px;font-weight:600;color:#b4502f;
                          letter-spacing:.04em">ARTICLE ORDERS</p>
                <h1 style="margin:0;font-size:19px;line-height:1.35;font-weight:600">${safeTitle}</h1>
                ${button}
              </td>
            </tr>
          </table>
          <p style="max-width:520px;margin:18px auto 0 auto;font-family:'IBM Plex Sans',Helvetica,Arial,sans-serif;
                    font-size:12px;color:#8a8178;text-align:center">
            You can turn these emails off under Settings &rarr; Notifications.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req: Request) => {
  // ---- authenticate -------------------------------------------------------
  // Without this the function is an open relay: anyone who learns the URL can
  // make it send mail.
  const expectedSecret = Deno.env.get("NOTIFY_WEBHOOK_SECRET");
  if (!expectedSecret) {
    console.error("NOTIFY_WEBHOOK_SECRET is not set; refusing to run.");
    return new Response("Not configured", { status: 500 });
  }
  if (req.headers.get("x-webhook-secret") !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  const row = payload.record;

  if (payload.type !== "INSERT" || !row) {
    return new Response(JSON.stringify({ skipped: "not an insert" }), { status: 200 });
  }

  const age = Date.now() - new Date(row.created_at).getTime();
  if (age > BACKFILL_CUTOFF_MS) {
    return new Response(JSON.stringify({ skipped: "backfilled row" }), { status: 200 });
  }

  // ---- resolve the recipient ---------------------------------------------
  // service_role because profiles is behind RLS and this runs for the user,
  // not as them. It never leaves the function.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${row.user_id}&select=email,preferences`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
  );

  if (!profileRes.ok) {
    console.error("profile lookup failed", profileRes.status, await profileRes.text());
    return new Response("Profile lookup failed", { status: 500 });
  }

  const [profile] = (await profileRes.json()) as Array<{
    email: string | null;
    preferences: { notifications?: Partial<typeof DEFAULT_NOTIFICATION_PREFS> } | null;
  }>;

  if (!profile?.email) {
    return new Response(JSON.stringify({ skipped: "no email on profile" }), { status: 200 });
  }

  const prefs = { ...DEFAULT_NOTIFICATION_PREFS, ...(profile.preferences?.notifications ?? {}) };
  if (!wantsEmail(row.kind, prefs)) {
    return new Response(JSON.stringify({ skipped: "muted by preferences" }), { status: 200 });
  }

  // ---- send ---------------------------------------------------------------
  const appUrl = Deno.env.get("APP_URL") ?? "";
  const orderUrl = row.order_id && appUrl ? `${appUrl}/orders/${row.order_id}` : null;

  const sendRes = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("EMAIL_FROM") ?? "Article Orders <onboarding@resend.dev>",
      to: [profile.email],
      subject: row.title,
      html: renderEmail(row.title, orderUrl),
    }),
  });

  if (!sendRes.ok) {
    // 200 back to the webhook regardless: a retry would re-send to anyone the
    // first attempt did reach, and Supabase's webhook retries are not
    // per-recipient. The log is the record.
    console.error("resend failed", sendRes.status, await sendRes.text());
    return new Response(JSON.stringify({ sent: false }), { status: 200 });
  }

  return new Response(JSON.stringify({ sent: true }), { status: 200 });
});
