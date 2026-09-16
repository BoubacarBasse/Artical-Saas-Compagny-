"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ORDER_STATUSES, STATUS_META, type OrderStatus } from "@/lib/orders/statuses";
import { ORDER_SORTS, type OrderSort } from "@/lib/data/types";
import { SearchIcon } from "@/components/shell/icons";

const SORT_LABELS: Record<OrderSort, string> = {
  created_desc: "Newest first",
  created_asc: "Oldest first",
  deadline_asc: "Deadline soonest",
  deadline_desc: "Deadline latest",
  title_asc: "Title A–Z",
};

export function OrdersToolbar({
  search,
  statuses,
  sort,
}: {
  search: string;
  statuses: OrderStatus[];
  sort: OrderSort;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search);
  const firstRun = useRef(true);

  function push(next: URLSearchParams) {
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (query.trim()) next.set("search", query.trim());
      else next.delete("search");
      push(next);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function toggleStatus(s: OrderStatus) {
    const active = statuses.includes(s);
    const nextStatuses = active ? statuses.filter((x) => x !== s) : [...statuses, s];
    const next = new URLSearchParams(searchParams.toString());
    if (nextStatuses.length > 0) next.set("statuses", nextStatuses.join(","));
    else next.delete("statuses");
    push(next);
  }

  function setSort(value: OrderSort) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "created_desc") next.delete("sort");
    else next.set("sort", value);
    push(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-b border-border-subtle p-3">
      <div className="flex w-[280px] items-center gap-2 rounded-md border border-border bg-canvas px-2.5 py-1.5">
        <SearchIcon className="h-3 w-3 shrink-0 text-fg-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title and brief"
          className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-fg outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="cursor-pointer border-0 bg-transparent p-0 text-sm leading-none text-fg-subtle"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ORDER_STATUSES.map((s) => {
          const active = statuses.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleStatus(s)}
              className={`cursor-pointer rounded-full border px-2.5 py-1.5 text-xs font-medium ${
                active
                  ? "border-accent bg-accent-surface-strong text-accent-hover"
                  : "border-border bg-surface text-fg-muted hover:border-border-strong"
              }`}
            >
              {STATUS_META[s].label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <label htmlFor="sort" className="text-xs text-fg-subtle">
          Sort
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as OrderSort)}
          className="cursor-pointer rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-fg"
        >
          {ORDER_SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
