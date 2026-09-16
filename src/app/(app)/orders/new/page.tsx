import Link from "next/link";
import { data } from "@/lib/data";
import { NewOrderForm } from "@/components/orders/new-order-form";

export default async function Page() {
  const profile = await data.getProfile();
  const defaults = profile?.preferences.orderDefaults;

  return (
    <div className="max-w-[720px]">
      <div className="mb-5">
        <Link href="/orders" className="mb-2.5 block text-[12.5px] font-medium text-accent hover:text-accent-hover">
          ← Back to My Tasks
        </Link>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Order an article</h1>
        <p className="text-[13.5px] text-fg-subtle">
          Saved as a draft first. A writer picks it up once you submit.
        </p>
      </div>

      <NewOrderForm
        defaultFormat={defaults?.format ?? null}
        defaultWordCount={defaults?.wordCount ?? null}
      />
    </div>
  );
}
