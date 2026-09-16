"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { fieldClass, labelClass } from "@/components/ui/form";

const initialState: AuthActionState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mb-5 text-[13px] text-fg-subtle">
        {next !== "/dashboard" ? "Sign in to continue where you left off." : "Welcome back."}
      </p>

      {state.error && (
        <div className="mb-4 rounded-md border border-danger-surface-border bg-danger-surface px-3.5 py-3 text-[13px] font-medium text-danger">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={fieldClass(Boolean(state.fieldErrors?.email))}
          />
          <FieldError>{state.fieldErrors?.email}</FieldError>
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={fieldClass(Boolean(state.fieldErrors?.password))}
          />
          <FieldError>{state.fieldErrors?.password}</FieldError>
        </div>

        <Button type="submit" loading={pending} className="mt-1 w-full justify-center">
          {pending ? "Signing in" : "Sign in"}
        </Button>
      </form>

      <p className="mt-5 text-center text-[13px] text-fg-subtle">
        Don&rsquo;t have an account?{" "}
        <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:text-accent-hover">
          Sign up
        </Link>
      </p>
    </div>
  );
}
