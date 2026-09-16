export function SavedBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-md border border-success-surface-border bg-success-surface px-3.5 py-2.5">
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-success-icon text-[11px] font-bold text-white">
        ✓
      </span>
      <span className="text-[13.5px] font-semibold text-success">{message}</span>
    </div>
  );
}
