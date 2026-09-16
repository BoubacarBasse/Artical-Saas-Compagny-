"use client";

import { useActionState } from "react";
import { updatePasswordAction, type ProfileActionState } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { fieldClass, labelClass } from "@/components/ui/form";
import { SavedBanner } from "@/components/ui/saved-banner";

const initialState: ProfileActionState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <section className="rounded-lg border border-border bg-surface p-5.5 shadow-sm">
      <h2 className="mb-1 text-[15px] font-semibold">Password</h2>
      <p className="mb-5 text-[13px] text-fg-subtle">At least 8 characters.</p>
      {state.saved && <SavedBanner message="Password updated" />}

      <form action={formAction} className="flex max-w-[440px] flex-col gap-4.5">
        <div>
          <label htmlFor="password" className={labelClass}>
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={fieldClass(Boolean(state.fieldErrors?.password))}
          />
          <FieldError>{state.fieldErrors?.password}</FieldError>
        </div>
        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={fieldClass(Boolean(state.fieldErrors?.confirmPassword))}
          />
          <FieldError>{state.fieldErrors?.confirmPassword}</FieldError>
        </div>
        <div className="mt-1.5 border-t border-border-subtle pt-4">
          <Button type="submit" loading={pending}>
            {pending ? "Updating" : "Update password"}
          </Button>
        </div>
      </form>
    </section>
  );
}
