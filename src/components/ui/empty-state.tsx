import type { ReactNode } from "react";

/**
 * The three empty-state kinds (never had orders, filtered to nothing, no
 * notifications) all share this shape but need different copy and actions —
 * see design/02-screens.md. Callers own that distinction; this is just layout.
 */
export function EmptyState({
  eyebrow,
  title,
  body,
  action,
  size = "md",
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const padding = { sm: "px-6 py-11", md: "px-6 py-14", lg: "px-6 py-16" }[size];
  return (
    <div className={`text-center ${padding}`}>
      {eyebrow && (
        <div className="mb-2.5 font-mono text-[11px] text-fg-faint">{eyebrow}</div>
      )}
      <div className="mb-1.5 text-[15px] font-semibold text-fg">{title}</div>
      {body && (
        <p className="mx-auto mb-4 max-w-sm text-[13px] text-fg-muted">{body}</p>
      )}
      {action}
    </div>
  );
}
