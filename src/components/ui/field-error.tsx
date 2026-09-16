export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <div className="mt-1.5 text-[12.5px] text-danger">{children}</div>;
}
