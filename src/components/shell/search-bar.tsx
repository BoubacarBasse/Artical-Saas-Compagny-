"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchOrdersAction } from "@/lib/actions/orders";
import { StatusBadge } from "@/components/ui/status-badge";
import { SearchIcon } from "./icons";

type Result = Awaited<ReturnType<typeof searchOrdersAction>>[number];

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "1") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchOrdersAction(q));
      });
    }, 150);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-[340px] max-w-[42vw] items-center gap-2.5 rounded-md border border-border bg-canvas px-3 py-2 text-left text-fg-subtle hover:border-border-strong hover:bg-surface-hover"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="flex-1 text-[13px]">Search orders</span>
        <span className="rounded border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-[11px]">
          ⌘1
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-60 flex items-start justify-center bg-fg/34 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-[620px] max-w-[92vw] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3.5">
              <SearchIcon className="h-3.5 w-3.5 text-fg-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search orders by title or brief"
                className="flex-1 border-0 bg-transparent text-[15px] outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-border-strong px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle"
              >
                esc
              </button>
            </div>
            <div className="max-h-[50vh] overflow-auto">
              {query.trim() === "" ? (
                <div className="px-4 py-8 text-center text-[13px] text-fg-subtle">
                  Start typing to search your orders
                </div>
              ) : results.length > 0 ? (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      router.push(`/orders/${r.id}`);
                    }}
                    className="flex w-full items-center gap-2.5 border-b border-border-faint px-4 py-3 text-left hover:bg-surface-muted"
                  >
                    <span className="font-mono text-[11.5px] text-fg-faint">#{r.orderNumber}</span>
                    <span className="flex-1 truncate text-[13.5px] font-medium">{r.title}</span>
                    <StatusBadge status={r.status} className="shrink-0" />
                  </button>
                ))
              ) : !pending ? (
                <div className="px-5 py-8 text-center text-[13px] text-fg-subtle">
                  No orders match &ldquo;{query}&rdquo;
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
