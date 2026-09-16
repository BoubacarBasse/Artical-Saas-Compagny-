"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { data } from "@/lib/data";
import type { NewOrderInput } from "@/lib/data/types";
import type { OrderFormat } from "@/lib/orders/statuses";

export type NewOrderActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Busts the shell (sidebar next-deadline, dashboard stats) after a mutation. */
function revalidateApp() {
  revalidatePath("/dashboard", "layout");
}

export async function createOrderAction(
  _prevState: NewOrderActionState,
  formData: FormData,
): Promise<NewOrderActionState> {
  const wordCountRaw = String(formData.get("wordCount") ?? "").trim();
  const deadlineRaw = String(formData.get("deadline") ?? "").trim();

  // `keywords` is the raw comma-separated field value here; newOrderSchema
  // (run inside data.createOrder) splits and validates it into a string[]
  // before anything touches storage. NewOrderInput describes that post-parse
  // shape, so the cast below bridges the one field that differs pre-parse.
  const input = {
    title: String(formData.get("title") ?? ""),
    brief: String(formData.get("brief") ?? ""),
    keywords: String(formData.get("keywords") ?? ""),
    format: String(formData.get("format") ?? "") as OrderFormat,
    wordCount: wordCountRaw === "" ? Number.NaN : Number(wordCountRaw),
    deadline: deadlineRaw === "" ? null : deadlineRaw,
  } as unknown as NewOrderInput;

  const result = await data.createOrder(input);
  if (!result.ok) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  revalidateApp();
  revalidatePath("/orders");
  redirect(`/orders/${result.data.id}`);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  await data.markAllNotificationsRead();
  revalidateApp();
  revalidatePath("/inbox");
}

/** Called directly from the header search modal — an RPC, not a form submit. */
export async function searchOrdersAction(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const page = await data.listOrders({ search: trimmed, perPage: 8, sort: "created_desc" });
  return page.rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    title: o.title,
    status: o.status,
  }));
}
