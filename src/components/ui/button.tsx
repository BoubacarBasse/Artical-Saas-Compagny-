import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

const VARIANTS = {
  primary:
    "border-0 bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-border-strong disabled:text-fg-faint",
  secondary:
    "border border-border bg-surface text-fg hover:bg-surface-hover disabled:border-border-subtle disabled:bg-surface-muted disabled:text-fg-faint",
  destructive:
    "border border-danger-surface-border bg-surface text-danger hover:bg-danger-surface disabled:border-border-subtle disabled:bg-surface-muted disabled:text-fg-faint",
  ghost:
    "border-0 bg-transparent text-accent hover:text-accent-hover disabled:text-fg-faint px-0",
} as const;

type Variant = keyof typeof VARIANTS;

export function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
}) {
  const padding = variant === "ghost" ? "" : "px-4 py-2.5";
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex cursor-pointer items-center gap-2 rounded-md ${padding} text-[13.5px] font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Spinner light={variant === "primary"} />}
      {children}
    </button>
  );
}

/** Same visual language as `Button`, for CTAs that navigate rather than submit. */
export function LinkButton({
  variant = "primary",
  className = "",
  children,
  href,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  href: string;
}) {
  const padding = variant === "ghost" ? "" : "px-4 py-2.5";
  return (
    <Link
      href={href}
      {...rest}
      className={`inline-flex items-center gap-2 rounded-md ${padding} text-[13.5px] font-semibold whitespace-nowrap transition-colors ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Spinner({
  light = true,
  className = "",
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`block h-3.5 w-3.5 animate-spin rounded-full border-2 ${
        light
          ? "border-white/40 border-t-white"
          : "border-border-strong border-t-fg-muted"
      } ${className}`}
    />
  );
}
