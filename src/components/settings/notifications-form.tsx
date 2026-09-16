"use client";

import { useActionState, useState } from "react";
import { updateNotificationPrefsAction, type ProfileActionState } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { SavedBanner } from "@/components/ui/saved-banner";
import type { Preferences } from "@/lib/data/types";

const initialState: ProfileActionState = {};

const ITEMS = [
  { key: "statusChange" as const, label: "Status changes", help: "When an order moves to a new stage." },
  { key: "delivered" as const, label: "Delivered", help: "When a finished piece is ready to download." },
  {
    key: "weeklySummary" as const,
    label: "Weekly summary",
    help: "A roundup of everything in flight, once a week.",
  },
];

export function NotificationsForm({
  notifications,
}: {
  notifications: Preferences["notifications"];
}) {
  const [state, formAction, pending] = useActionState(updateNotificationPrefsAction, initialState);
  const [values, setValues] = useState(notifications);

  return (
    <section className="rounded-lg border border-border bg-surface p-5.5 shadow-sm">
      <h2 className="mb-1 text-[15px] font-semibold">Notifications</h2>
      <p className="mb-2 text-[13px] text-fg-subtle">
        What we email you about. Everything still shows in your inbox.
      </p>
      {state.saved && <SavedBanner message="Notification settings updated" />}

      <form action={formAction}>
        {ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-5 border-t border-border-subtle py-3.5"
          >
            <div>
              <div className="text-[13.5px] font-medium">{item.label}</div>
              <div className="mt-0.5 text-[12.5px] text-fg-subtle">{item.help}</div>
            </div>
            <input type="hidden" name={item.key} value={values[item.key] ? "on" : ""} />
            <Toggle
              checked={values[item.key]}
              onChange={() => setValues((v) => ({ ...v, [item.key]: !v[item.key] }))}
              label={item.label}
            />
          </div>
        ))}
        <div className="mt-4 border-t border-border-subtle pt-4">
          <Button type="submit" loading={pending}>
            {pending ? "Saving" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
