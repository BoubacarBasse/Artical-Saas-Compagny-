"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, InboxIcon, TasksIcon } from "./icons";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/orders", label: "My Tasks", Icon: TasksIcon },
  { href: "/inbox", label: "Inbox", Icon: InboxIcon },
] as const;

export function NavLinks({ unread }: { unread: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-1.5">
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[13.5px] font-medium ${
              active ? "bg-accent-surface text-accent-hover" : "text-fg hover:bg-surface-hover"
            }`}
          >
            <Icon className="h-4 w-4 opacity-85" />
            <span className="flex-1 text-left">{label}</span>
            {href === "/inbox" && unread > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[11px] font-semibold text-accent-fg">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
