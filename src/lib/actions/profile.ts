"use server";

import { revalidatePath } from "next/cache";
import { data } from "@/lib/data";
import { fieldErrorsFrom, updatePasswordSchema } from "@/lib/data/schemas";
import type { ProfilePatch } from "@/lib/data/types";
import type { OrderFormat } from "@/lib/orders/statuses";

export type ProfileActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  saved?: boolean;
};

function revalidateApp() {
  revalidatePath("/dashboard", "layout");
}

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim();

  const patch: ProfilePatch = {
    fullName: fullName || null,
    company: company || null,
    avatarUrl: avatarUrl || null,
  };

  const result = await data.updateProfile(patch);
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  revalidateApp();
  return { saved: true };
}

/**
 * `preferences` is one jsonb column, so a patch that touches only the
 * notification toggles still has to carry the current order-default values
 * forward — the provider replaces the whole object, it does not merge.
 */
export async function updateNotificationPrefsAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const profile = await data.getProfile();
  if (!profile) return { error: "You need to be signed in to do that" };

  const patch: ProfilePatch = {
    preferences: {
      ...profile.preferences,
      notifications: {
        statusChange: formData.get("statusChange") === "on",
        delivered: formData.get("delivered") === "on",
        weeklySummary: formData.get("weeklySummary") === "on",
      },
    },
  };

  const result = await data.updateProfile(patch);
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  revalidatePath("/settings");
  return { saved: true };
}

export async function updateOrderDefaultsAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const profile = await data.getProfile();
  if (!profile) return { error: "You need to be signed in to do that" };

  const wordCountRaw = String(formData.get("wordCount") ?? "").trim();
  const format = String(formData.get("format") ?? "").trim();
  const tone = String(formData.get("tone") ?? "").trim();

  const patch: ProfilePatch = {
    preferences: {
      ...profile.preferences,
      orderDefaults: {
        wordCount: wordCountRaw === "" ? null : Number(wordCountRaw),
        format: (format || null) as OrderFormat | null,
        tone: tone || null,
      },
    },
  };

  const result = await data.updateProfile(patch);
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  revalidatePath("/settings");
  revalidatePath("/orders/new");
  return { saved: true };
}

export async function updatePasswordAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    return { error: "Check the details below", fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const result = await data.updatePassword(parsed.data.password);
  if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors };
  return { saved: true };
}
