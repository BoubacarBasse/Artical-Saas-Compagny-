import Link from "next/link";
import { data } from "@/lib/data";
import { formatDateLong, formatDateShort, splitFilename } from "@/lib/format";
import { isOverdue } from "@/lib/orders/stats";
import { FORMAT_LABELS, STATUS_META } from "@/lib/orders/statuses";
import type { OrderEvent } from "@/lib/data/types";
import { StatusBadge, statusDotClass } from "@/components/ui/status-badge";
import { PriorityDot } from "@/components/ui/priority-dot";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

const EVENT_DOT: Record<OrderEvent["kind"], string> = {
  submitted: "bg-fg-faint",
  status_changed: "bg-fg-muted",
  delivered: "bg-status-completed-dot",
  cancelled: "bg-status-cancelled-dot",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await data.getOrder(id);

  if (!order) {
    return (
      <div className="mx-auto mt-6 max-w-[520px] rounded-lg border border-border bg-surface shadow-sm">
        <EmptyState
          eyebrow="404"
          title="This order is not available"
          body="We could not find an order here under your account. If you followed a link from somewhere else, it may belong to a different client."
          size="lg"
          action={
            <LinkButton href="/orders" className="mx-auto">
              Back to My Tasks
            </LinkButton>
          }
        />
      </div>
    );
  }

  const events = await data.getOrderEvents(order.id);
  const meta = STATUS_META[order.status];
  const overdue = isOverdue(order);

  const details = [
    { label: "Format", value: FORMAT_LABELS[order.format] },
    { label: "Word count", value: `${order.wordCount.toLocaleString()} words` },
    { label: "Deadline", value: formatDateShort(order.deadline), danger: overdue },
    { label: "Created", value: formatDateLong(order.createdAt) },
  ];

  return (
    <div>
      <div className="mb-3.5 flex items-center gap-1.5 text-[12.5px] text-fg-subtle">
        <Link href="/orders" className="font-medium text-accent hover:text-accent-hover">
          Orders
        </Link>
        <span className="text-border-strong">›</span>
        <span className="font-mono">Order #{order.orderNumber}</span>
      </div>

      <div className="mb-5.5 flex items-start gap-3.5">
        <h1 className="max-w-[760px] text-2xl leading-[1.28] font-semibold tracking-tight text-wrap-pretty">
          {order.title}
        </h1>
        <div className="mt-1 flex shrink-0 gap-2">
          <StatusBadge status={order.status} />
          {overdue && (
            <span className="inline-flex items-center rounded-full border border-danger-surface-border bg-danger-surface px-2.5 py-0.5 text-xs font-semibold text-danger">
              Overdue
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1.42fr_1fr] items-start gap-4">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-lg border border-border bg-surface p-5.5 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className={`block h-2 w-2 rounded-full ${statusDotClass(order.status)}`} />
              <h2 className="text-[15.5px] font-semibold">{meta.contentHeading}</h2>
            </div>
            <p className="max-w-[60ch] text-[13.5px] text-fg-muted">{meta.contentBody}</p>

            {order.deliverable && (
              <div className="mt-4.5 flex items-center gap-3.5 rounded-md border border-border bg-surface p-3.5">
                <div className="relative h-11 w-9 shrink-0 rounded-sm border border-border-strong bg-canvas">
                  <span className="absolute right-1 bottom-1 left-1 text-center font-mono text-[8px] font-medium tracking-wide text-fg-muted">
                    {splitFilename(order.deliverable.filename).ext.replace(".", "").toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-0.5 text-[13px] font-medium">
                    <span className="min-w-0 truncate">
                      {splitFilename(order.deliverable.filename).stem}
                    </span>
                    <span className="shrink-0 text-fg-muted">
                      {splitFilename(order.deliverable.filename).ext}
                    </span>
                  </div>
                  <div className="mt-0.5 font-mono text-[11.5px] text-fg-faint">
                    Uploaded {formatDateShort(order.deliverable.uploadedAt)}
                  </div>
                </div>
                <a
                  href={order.deliverable.url}
                  className="shrink-0 rounded-md bg-accent px-3.5 py-2.5 text-[13px] font-semibold text-accent-fg hover:bg-accent-hover"
                >
                  Download
                </a>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-5.5 shadow-sm">
            <h2 className="mb-3 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
              Original brief
            </h2>
            <p className="max-w-[68ch] text-sm leading-relaxed whitespace-pre-line text-fg">
              {order.brief}
            </p>
            {order.keywords.length > 0 && (
              <div className="mt-5 border-t border-border-subtle pt-4">
                <div className="mb-2 text-[11.5px] text-fg-subtle">Keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {order.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded-md border border-border-subtle bg-surface-hover px-2.5 py-1 font-mono text-xs text-fg-muted"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-lg border border-border bg-surface px-5 py-4.5 shadow-sm">
            <h2 className="mb-3.5 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
              Details
            </h2>
            {details.map((d) => (
              <div
                key={d.label}
                className="flex items-baseline justify-between gap-3.5 border-b border-border-faint py-2"
              >
                <span className="shrink-0 text-[12.5px] text-fg-subtle">{d.label}</span>
                <span
                  className={`font-mono text-[13px] font-medium ${d.danger ? "text-danger" : "text-fg"}`}
                >
                  {d.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3.5 pt-2.5">
              <span className="text-[12.5px] text-fg-subtle">Priority</span>
              <PriorityDot priority={order.priority} />
            </div>
            <div className="mt-1 flex items-center justify-between gap-3.5">
              <span className="text-[12.5px] text-fg-subtle">Writers</span>
              <AvatarStack assignees={order.assignees} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface px-5 py-4.5 shadow-sm">
            <h2 className="mb-4 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
              History
            </h2>
            {events.map((e, i) => (
              <div key={e.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
                <div className="flex flex-col items-center">
                  <span className={`mt-1 block h-2.5 w-2.5 shrink-0 rounded-full ${EVENT_DOT[e.kind]}`} />
                  {i < events.length - 1 && <span className="w-px flex-1 bg-border-subtle" />}
                </div>
                <div className="pb-4">
                  <div className="text-sm font-medium text-wrap-pretty text-fg">{e.label}</div>
                  <div className="mt-0.5 font-mono text-[11.5px] text-fg-faint">
                    {formatDateLong(e.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
