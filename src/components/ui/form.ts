/**
 * Shared field styling. A function rather than a component because inputs,
 * textareas and selects all need it but have too little else in common to
 * share a wrapper.
 */
export function fieldClass(hasError: boolean, extra = ""): string {
  return `w-full rounded-md border ${hasError ? "border-danger-border" : "border-border"} bg-surface px-3 py-2.5 text-sm text-fg outline-none focus:border-accent focus:ring-3 focus:ring-focus-ring disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-muted disabled:text-fg-subtle ${extra}`;
}

export const labelClass = "mb-1.5 block text-[13px] font-semibold text-fg";
export const hintClass = "mt-1.5 text-xs text-fg-faint";
export const counterClass = "font-mono text-[11.5px]";
