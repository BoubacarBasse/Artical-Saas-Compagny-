import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { data, isMockMode } from "@/lib/data";
import { formatDateShort } from "@/lib/format";
import { NavLinks } from "@/components/shell/nav-links";
import { SearchBar } from "@/components/shell/search-bar";
import { UserMenu } from "@/components/shell/user-menu";
import { BellIcon } from "@/components/shell/icons";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await data.getCurrentUser();
  if (!user) redirect("/login");

  const [profile, unread, stats] = await Promise.all([
    data.getProfile(),
    data.unreadNotificationCount(),
    data.getDashboardStats(),
  ]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2.5 px-5 pt-[22px] pb-[18px]">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[13px] font-semibold tracking-tight text-accent-fg">
            A
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">Article Orders</div>
            <div className="font-mono text-[11px] text-fg-subtle">
              {profile?.company || "—"}
            </div>
          </div>
        </div>

        <NavLinks unread={unread} />

        <div className="px-4 pt-3.5 pb-1.5">
          <Link
            href="/orders/new"
            className="block w-full rounded-md bg-accent px-3 py-2.5 text-center text-[13.5px] font-semibold text-accent-fg shadow-sm hover:bg-accent-hover"
          >
            Order an article
          </Link>
        </div>

        <div className="mt-auto border-t border-border p-4">
          <div className="text-[11px] leading-relaxed text-fg-faint">
            Next deadline
            <br />
            <span className="font-mono text-xs text-fg-muted">
              {formatDateShort(stats.nextDeadline)}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
          <SearchBar />
          <div className="flex-1" />
          <Link
            href="/inbox"
            aria-label="Inbox"
            className="relative flex h-[34px] w-[34px] items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-hover"
          >
            <BellIcon className="h-3.5 w-3.5 text-fg-muted" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-accent font-mono text-[10px] font-semibold text-accent-fg">
                {unread}
              </span>
            )}
          </Link>
          <UserMenu fullName={profile?.fullName ?? null} email={user.email} />
        </header>

        {isMockMode && (
          <div className="flex items-center gap-2.5 border-b border-warning-surface-border bg-warning-surface px-6 py-2.5 text-[12.5px] text-warning">
            <span className="rounded-sm border border-warning-surface-border px-1.5 py-0.5 font-mono text-[10.5px] font-medium tracking-wide uppercase">
              Demo data
            </span>
            <span>You are looking at sample orders. Nothing here is connected to a live database.</span>
          </div>
        )}

        <main className="flex-1 px-6 pt-7 pb-24">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
