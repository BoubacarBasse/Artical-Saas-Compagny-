"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/lib/actions/auth";
import { profileInitials } from "@/lib/format";
import { ChevronDownIcon } from "./icons";

export function UserMenu({
  fullName,
  email,
}: {
  fullName: string | null;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const displayName = fullName ?? email;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg border border-transparent py-1 pr-2 pl-1 hover:border-border hover:bg-surface-hover"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-avatar-1 text-[11.5px] font-semibold tracking-wide text-white">
          {profileInitials(fullName, email)}
        </span>
        <span className="text-[13px] font-medium text-fg">{displayName}</span>
        <ChevronDownIcon className="h-2 w-2.5 text-fg-subtle" />
      </button>

      {open && (
        <div className="absolute top-[46px] right-0 z-40 w-[252px] rounded-xl border border-border bg-surface p-1.5 shadow-md">
          <div className="mb-1.5 border-b border-border-subtle px-2.5 pt-2.5 pb-3">
            <div className="text-[13.5px] font-semibold">{displayName}</div>
            <div className="font-mono text-xs text-fg-subtle">{email}</div>
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block w-full rounded-md px-2.5 py-2.5 text-left text-[13px] text-fg hover:bg-surface-hover"
          >
            Settings
          </Link>
          <div className="my-1.5 h-px bg-border-subtle" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full cursor-pointer rounded-md px-2.5 py-2.5 text-left text-[13px] text-danger hover:bg-danger-surface"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
