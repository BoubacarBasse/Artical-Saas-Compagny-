import Link from "next/link";
import { data } from "@/lib/data";
import { formatDateShort, greeting } from "@/lib/format";
import { isOverdue } from "@/lib/orders/stats";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CompletionsChart } from "@/components/dashboard/completions-chart";

const CARD_COLOR = {
  total: "text-fg",
  draft: "text-status-draft-fg",
  inProgress: "text-status-in-progress-fg",
  pendingReview: "text-status-pending-review-fg",
  completed: "text-status-completed-fg",
  overdue: "text-danger",
} as const;

export default async function Page() {
  const [profile, stats, recent] = await Promise.all([
    data.getProfile(),
    data.getDashboardStats(),
    data.listOrders({ sort: "created_desc", perPage: 5 }),
  ]);

  const cards = [
    { key: "total", label: "Total orders", value: stats.total },
    { key: "draft", label: "Draft", value: stats.draft },
    { key: "inProgress", label: "In progress", value: stats.inProgress },
    { key: "pendingReview", label: "Pending review", value: stats.pendingReview },
    { key: "completed", label: "Completed", value: stats.completed },
    { key: "overdue", label: "Overdue", value: stats.overdue },
  ] as const;

  const totalCompletions = stats.completionsByMonth.reduce((n, m) => n + m.count, 0);
  const chartEmpty = totalCompletions === 0;

  const subtitle =
    stats.overdue > 0
      ? `You have ${stats.overdue} order${stats.overdue === 1 ? "" : "s"} past its deadline.`
      : "Here's where your orders stand.";

  return (
    <div>
      <div className="mb-5.5 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">
            {greeting(profile?.fullName ?? null)}
          </h1>
          <p className="text-[13.5px] text-fg-subtle">{subtitle}</p>
        </div>
        <LinkButton href="/orders/new" className="shrink-0">
          Order an article
        </LinkButton>
      </div>

      <div className="mb-4 grid grid-cols-6 gap-3">
        {cards.map((c) => (
          <div
            key={c.key}
            className="rounded-lg border border-border bg-surface p-4 shadow-sm"
          >
            <div className="mb-2 truncate text-[11.5px] tracking-wide text-fg-subtle">
              {c.label}
            </div>
            <div className={`font-mono text-2xl font-medium tracking-tight ${CARD_COLOR[c.key]}`}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1.15fr_1fr] items-start gap-4">
        <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-[14.5px] font-semibold">Articles completed</h2>
            <span className="font-mono text-[11.5px] text-fg-faint">last 7 months</span>
          </div>
          <p className="mb-5.5 text-[12.5px] text-fg-subtle">
            {chartEmpty
              ? "No pieces delivered yet in this window."
              : `${totalCompletions} article${totalCompletions === 1 ? "" : "s"} completed in the last 7 months.`}
          </p>

          {chartEmpty ? (
            <div className="rounded-lg border border-dashed border-border-strong bg-surface-muted px-6 py-7.5 text-center">
              <div className="mb-1 text-[13.5px] font-semibold">No completed articles yet</div>
              <p className="mx-auto max-w-[300px] text-[12.5px] text-fg-subtle">
                This chart fills in as pieces are delivered. Your first order will show up here
                the month it is finished.
              </p>
            </div>
          ) : (
            <CompletionsChart months={stats.completionsByMonth} />
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between px-4.5 pt-4 pb-3">
            <h2 className="text-[14.5px] font-semibold">Recent orders</h2>
            <Link href="/orders" className="text-[12.5px] font-semibold text-accent hover:text-accent-hover">
              View all
            </Link>
          </div>
          {recent.rows.length > 0 ? (
            <div>
              {recent.rows.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="block border-t border-border-subtle px-4.5 py-3 hover:bg-surface-muted"
                >
                  <div className="mb-1 flex items-center gap-2.5">
                    <span className="font-mono text-[11.5px] text-fg-faint">#{o.orderNumber}</span>
                    <StatusBadge status={o.status} />
                    <span
                      className={`ml-auto font-mono text-[11.5px] ${isOverdue(o) ? "text-danger" : "text-fg-faint"}`}
                    >
                      {formatDateShort(o.deadline)}
                    </span>
                  </div>
                  <div className="truncate text-[13.5px] font-medium">{o.title}</div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border-t border-border-subtle">
              <EmptyState
                size="sm"
                title="No orders yet"
                body="Tell us what you need written and we will assign a writer."
                action={
                  <LinkButton href="/orders/new" className="mx-auto">
                    Order your first article
                  </LinkButton>
                }
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
