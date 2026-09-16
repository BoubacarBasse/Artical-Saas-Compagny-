import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[13px] font-semibold text-accent-fg">
            A
          </span>
          <span className="text-sm font-semibold tracking-tight text-fg">Article Orders</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
