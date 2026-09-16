import Link from "next/link";
import { data } from "@/lib/data";
import { parseOrderQuery } from "@/lib/data/schemas";
import { formatDateShort } from "@/lib/format";
import { isOverdue } from "@/lib/orders/stats";
import { FORMAT_LABELS } from "@/lib/orders/statuses";
import { LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { OrdersToolbar } from "@/components/orders/orders-toolbar";
import { ActiveFilters } from "@/components/orders/active-filters";
import { Pagination } from "@/components/orders/pagination";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const rawParams = await searchParams;
  const query = parseOrderQuery(rawParams);
  const [result, unfiltered] = await Promise.all([
    data.listOrders(query),
    data.listOrders({ perPage: 1 }),
  ]);

  const search = query.search ?? "";
  const statuses = query.statuses ?? [];
  const sort = query.sort ?? "created_desc";
  const flatParams: Record<string, string | undefined> = {
    search: search || undefined,
    statuses: statuses.length ? statuses.join(",") : undefined,
    sort: sort === "created_desc" ? undefined : sort,
  };

  const hasRows = result.rows.length > 0;
  const filteredToNothing = !hasRows && unfiltered.total > 0;
  const noOrdersAtAll = !hasRows && unfiltered.total === 0;

  return (
    <div>
      <div className="mb-4.5 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight">My Tasks</h1>
          <p className="text-[13.5px] text-fg-subtle">
            {unfiltered.total} order{unfiltered.total === 1 ? "" : "s"} in total.
          </p>
        </div>
        <LinkButton href="/orders/new" className="shrink-0">
          Order an article
        </LinkButton>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <OrdersToolbar search={search} statuses={statuses} sort={sort} />
        <ActiveFilters search={search} statuses={statuses} />

        {hasRows && (
          <div>
            <div className="grid grid-cols-[76px_minmax(0,1fr)_132px_120px_124px] gap-4 border-b border-border-subtle bg-surface-muted px-4 py-2.5 text-[11px] font-semibold tracking-wide text-fg-subtle uppercase">
              <div>Order</div>
              <div>Article</div>
              <div>Status</div>
              <div>Writers</div>
              <div>Deadline</div>
            </div>
            {result.rows.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="grid grid-cols-[76px_minmax(0,1fr)_132px_120px_124px] items-center gap-4 border-b border-border-faint px-4 py-3.5 hover:bg-surface-muted"
              >
                <div className="font-mono text-[12.5px] text-fg-subtle">#{o.orderNumber}</div>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium">{o.title}</div>
                  <div className="mt-0.5 text-[11.5px] text-fg-faint">
                    {FORMAT_LABELS[o.format]} · {o.wordCount.toLocaleString()} words
                  </div>
                </div>
                <div>
                  <StatusBadge status={o.status} />
                </div>
                <div>
                  <AvatarStack assignees={o.assignees} max={2} />
                </div>
                <div
                  className={`font-mono text-[12.5px] ${isOverdue(o) ? "font-semibold text-danger" : "text-fg-muted"}`}
                >
                  {formatDateShort(o.deadline)}
                </div>
              </Link>
            ))}
            <Pagination page={result} searchParams={flatParams} />
          </div>
        )}

        {filteredToNothing && (
          <EmptyState
            title="No orders match these filters"
            body={`You have ${unfiltered.total} orders in total. Widen the filter to see them.`}
            size="lg"
          />
        )}

        {noOrdersAtAll && (
          <EmptyState
            title="Nothing ordered yet"
            body="Describe the piece you need — format, length, keywords — and a writer picks it up from there. You will see it move through production on this page."
            size="lg"
            action={
              <LinkButton href="/orders/new" className="mx-auto">
                Order your first article
              </LinkButton>
            }
          />
        )}
      </div>
    </div>
  );
}
