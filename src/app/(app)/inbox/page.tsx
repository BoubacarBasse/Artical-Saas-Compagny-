import Link from "next/link";
import { data } from "@/lib/data";
import { formatDateShort } from "@/lib/format";
import { markAllNotificationsReadAction } from "@/lib/actions/orders";
import { EmptyState } from "@/components/ui/empty-state";
import type { Notification } from "@/lib/data/types";

const GLYPH: Record<Notification["kind"], { icon: string; bg: string; fg: string }> = {
  order_update: { icon: "↑", bg: "bg-accent-surface", fg: "text-accent-hover" },
  order_complete: { icon: "✓", bg: "bg-success-surface", fg: "text-success" },
  system: { icon: "•", bg: "bg-border-subtle", fg: "text-fg-muted" },
};

export default async function Page() {
  const notifications = await data.listNotifications();
  const unread = notifications.filter((n) => n.readAt === null).length;

  return (
    <div className="max-w-[760px]">
      <div className="mb-4.5 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="text-[13.5px] text-fg-subtle">
            {unread > 0
              ? `${unread} unread notification${unread === 1 ? "" : "s"}.`
              : "You are all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button
              type="submit"
              className="shrink-0 cursor-pointer rounded-md border border-border bg-surface px-3.5 py-2.5 text-[13px] font-medium hover:bg-surface-hover"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {notifications.length === 0 ? (
          <EmptyState
            title="Nothing to read"
            body="When a writer picks up your order or delivers a piece, the update lands here."
            size="lg"
          />
        ) : (
          notifications.map((n) => {
            const glyph = GLYPH[n.kind];
            const content = (
              <>
                <span
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md font-mono text-xs font-semibold ${glyph.bg} ${glyph.fg}`}
                >
                  {glyph.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[13.5px] text-wrap-pretty text-fg ${n.readAt === null ? "font-semibold" : "font-normal"}`}
                  >
                    {n.title}
                  </div>
                  <div className="mt-1 flex items-center gap-2.5">
                    <span className="font-mono text-[11.5px] text-fg-faint">
                      {formatDateShort(n.createdAt)}
                    </span>
                    {n.orderId && (
                      <span className="text-[11.5px] font-medium text-accent">View order</span>
                    )}
                  </div>
                </div>
                {n.readAt === null && (
                  <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                )}
              </>
            );

            const rowClass = `flex items-start gap-3.5 border-t border-border-faint px-4.5 py-3.5 first:border-t-0 ${
              n.readAt === null ? "bg-accent-surface/40" : ""
            }`;

            return n.orderId ? (
              <Link key={n.id} href={`/orders/${n.orderId}`} className={`${rowClass} hover:bg-surface-muted`}>
                {content}
              </Link>
            ) : (
              <div key={n.id} className={rowClass}>
                {content}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
