"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STATUS_META, type OrderStatus } from "@/lib/orders/statuses";

export function ActiveFilters({
  search,
  statuses,
}: {
  search: string;
  statuses: OrderStatus[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!search && statuses.length === 0) return null;

  function go(next: URLSearchParams) {
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function removeStatus(s: OrderStatus) {
    const next = new URLSearchParams(searchParams.toString());
    const remaining = statuses.filter((x) => x !== s);
    if (remaining.length > 0) next.set("statuses", remaining.join(","));
    else next.delete("statuses");
    go(next);
  }

  function removeSearch() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("search");
    go(next);
  }

  function clearAll() {
    router.push(pathname, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-muted px-3 py-2.5">
      <span className="text-xs text-fg-subtle">Filtered by</span>
      {search && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-surface-strong py-0.5 pr-1.5 pl-2.5 text-[11.5px] font-semibold text-accent-hover">
          &ldquo;{search}&rdquo;
          <button type="button" onClick={removeSearch} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] leading-none">
            ×
          </button>
        </span>
      )}
      {statuses.map((s) => (
        <span
          key={s}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-surface-strong py-0.5 pr-1.5 pl-2.5 text-[11.5px] font-semibold text-accent-hover"
        >
          {STATUS_META[s].label}
          <button
            type="button"
            onClick={() => removeStatus(s)}
            className="cursor-pointer border-0 bg-transparent p-0 text-[13px] leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-1 cursor-pointer border-0 bg-transparent p-0 text-xs font-semibold text-accent underline"
      >
        Clear all
      </button>
    </div>
  );
}
