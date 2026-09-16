export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-[42px] shrink-0 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-[left] ${
          checked ? "left-[21px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
