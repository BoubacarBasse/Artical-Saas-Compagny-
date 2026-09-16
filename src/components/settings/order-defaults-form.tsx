"use client";

import { useActionState } from "react";
import { updateOrderDefaultsAction, type ProfileActionState } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { fieldClass, labelClass } from "@/components/ui/form";
import { SavedBanner } from "@/components/ui/saved-banner";
import { FORMAT_LABELS, ORDER_FORMATS } from "@/lib/orders/statuses";
import type { Preferences } from "@/lib/data/types";

const initialState: ProfileActionState = {};

export function OrderDefaultsForm({ defaults }: { defaults: Preferences["orderDefaults"] }) {
  const [state, formAction, pending] = useActionState(updateOrderDefaultsAction, initialState);

  return (
    <section className="rounded-lg border border-border bg-surface p-5.5 shadow-sm">
      <h2 className="mb-1 text-[15px] font-semibold">Order defaults</h2>
      <p className="mb-5 text-[13px] text-fg-subtle">
        All optional. These pre-fill the order form; you can change them on any order.
      </p>
      {state.saved && <SavedBanner message="Defaults updated" />}

      <form action={formAction} className="flex max-w-[440px] flex-col gap-4.5">
        <div>
          <label htmlFor="wordCount" className={labelClass}>
            Default word count
          </label>
          <input
            id="wordCount"
            name="wordCount"
            defaultValue={defaults.wordCount ?? ""}
            inputMode="numeric"
            className={fieldClass(false, "font-mono")}
          />
        </div>
        <div>
          <label htmlFor="format" className={labelClass}>
            Default format
          </label>
          <select
            id="format"
            name="format"
            defaultValue={defaults.format ?? ""}
            className={fieldClass(false, "cursor-pointer")}
          >
            <option value="">No default</option>
            {ORDER_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tone" className={labelClass}>
            Default tone
          </label>
          <input
            id="tone"
            name="tone"
            defaultValue={defaults.tone ?? ""}
            placeholder="e.g. practical, plain-spoken"
            className={fieldClass(false)}
          />
        </div>
        <div className="mt-1.5 border-t border-border-subtle pt-4">
          <Button type="submit" loading={pending}>
            {pending ? "Saving" : "Save defaults"}
          </Button>
        </div>
      </form>
    </section>
  );
}
