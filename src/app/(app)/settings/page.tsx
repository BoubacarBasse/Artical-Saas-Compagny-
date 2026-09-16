import Link from "next/link";
import { redirect } from "next/navigation";
import { data } from "@/lib/data";
import { ProfileForm } from "@/components/settings/profile-form";
import { NotificationsForm } from "@/components/settings/notifications-form";
import { OrderDefaultsForm } from "@/components/settings/order-defaults-form";
import { PasswordForm } from "@/components/settings/password-form";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "notifications", label: "Notifications" },
  { key: "defaults", label: "Order defaults" },
  { key: "password", label: "Password" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const active: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "profile";

  const profile = await data.getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="max-w-[880px]">
      <div className="mb-3 text-[12.5px] text-fg-subtle">Reached from your avatar menu, top right.</div>
      <h1 className="mb-4.5 text-2xl font-semibold tracking-tight">Settings</h1>

      <div className="grid grid-cols-[200px_minmax(0,1fr)] items-start gap-6">
        <nav className="sticky top-[88px] flex flex-col gap-0.5">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "profile" ? "/settings" : `/settings?tab=${t.key}`}
              className={`rounded-md px-2.5 py-2.5 text-left text-[13px] font-medium ${
                active === t.key ? "bg-accent-surface text-accent-hover" : "text-fg hover:bg-surface-hover"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="min-w-0">
          {active === "profile" && <ProfileForm profile={profile} />}
          {active === "notifications" && (
            <NotificationsForm notifications={profile.preferences.notifications} />
          )}
          {active === "defaults" && (
            <OrderDefaultsForm defaults={profile.preferences.orderDefaults} />
          )}
          {active === "password" && <PasswordForm />}
        </div>
      </div>
    </div>
  );
}
