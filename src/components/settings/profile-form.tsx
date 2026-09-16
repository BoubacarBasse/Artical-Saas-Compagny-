"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileActionState } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { fieldClass, hintClass, labelClass } from "@/components/ui/form";
import { SavedBanner } from "@/components/ui/saved-banner";
import type { Profile } from "@/lib/data/types";

const initialState: ProfileActionState = {};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <section className="rounded-lg border border-border bg-surface p-5.5 shadow-sm">
      <h2 className="mb-1 text-[15px] font-semibold">Profile</h2>
      <p className="mb-5 text-[13px] text-fg-subtle">How your name appears on orders.</p>
      {state.saved && <SavedBanner message="Profile updated" />}

      <form action={formAction} className="flex max-w-[440px] flex-col gap-4.5">
        <div>
          <label htmlFor="fullName" className={labelClass}>
            Full name
          </label>
          <input id="fullName" name="fullName" defaultValue={profile.fullName ?? ""} className={fieldClass(false)} />
        </div>
        <div>
          <label htmlFor="company" className={labelClass}>
            Company
          </label>
          <input id="company" name="company" defaultValue={profile.company ?? ""} className={fieldClass(false)} />
        </div>
        <div>
          <label htmlFor="avatarUrl" className={labelClass}>
            Avatar URL <span className="font-normal text-fg-faint">optional</span>
          </label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            defaultValue={profile.avatarUrl ?? ""}
            placeholder="https://"
            className={fieldClass(Boolean(state.fieldErrors?.avatarUrl), "font-mono")}
          />
          {state.fieldErrors?.avatarUrl ? (
            <FieldError>{state.fieldErrors.avatarUrl}</FieldError>
          ) : (
            <p className={hintClass}>Leave empty and we show your initials.</p>
          )}
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            disabled
            value={profile.email}
            readOnly
            className={fieldClass(false, "cursor-not-allowed font-mono")}
          />
          <p className={hintClass}>Contact us to change the email on the account.</p>
        </div>
        <div className="mt-1.5 border-t border-border-subtle pt-4">
          <Button type="submit" loading={pending}>
            {pending ? "Saving" : "Save changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
