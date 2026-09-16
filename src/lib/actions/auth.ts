"use server";

import { redirect } from "next/navigation";
import { data } from "@/lib/data";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const result = await data.signIn(email, password);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }
  redirect(next);
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const result = await data.signUp(email, password);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  await data.signOut();
  redirect("/login");
}
