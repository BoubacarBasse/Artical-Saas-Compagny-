import Link from "next/link";
import type { Page } from "@/lib/data/types";

/** Builds an href for `page`, keeping every other query param as-is. */
function hrefFor(searchParams: Record<string, string | undefined>, page: number): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) next.set(key, value);
  }
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  const qs = next.toString();
  return qs ? `/orders?${qs}` : "/orders";
}

export function Pagination<T>({
  page: result,
  searchParams,
}: {
  page: Page<T>;
  searchParams: Record<string, string | undefined>;
}) {
  const { page, pageCount, total, perPage } = result;
  if (total === 0) return null;

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const pages: number[] = [];
  for (let p = Math.max(1, page - 1); p <= Math.min(pageCount, page + 1); p++) pages.push(p);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="font-mono text-[12.5px] text-fg-subtle">
        Showing {from}–{to} of {total}
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          href={hrefFor(searchParams, Math.max(1, page - 1))}
          aria-disabled={page === 1}
          className={`rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12.5px] ${
            page === 1
              ? "pointer-events-none text-fg-faint"
              : "text-fg hover:bg-surface-hover"
          }`}
        >
          Previous
        </Link>
        {pages.map((p) => (
          <Link
            key={p}
            href={hrefFor(searchParams, p)}
            className={`min-w-[30px] rounded-md border px-2 py-1.5 text-center font-mono text-[12.5px] font-semibold ${
              p === page
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-surface text-fg hover:bg-surface-hover"
            }`}
          >
            {p}
          </Link>
        ))}
        <Link
          href={hrefFor(searchParams, Math.min(pageCount, page + 1))}
          aria-disabled={page === pageCount}
          className={`rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12.5px] ${
            page === pageCount
              ? "pointer-events-none text-fg-faint"
              : "text-fg hover:bg-surface-hover"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
