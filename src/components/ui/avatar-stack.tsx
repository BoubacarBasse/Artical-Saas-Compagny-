import { initials } from "@/lib/format";
import type { Assignee } from "@/lib/data/types";

const AVATAR_CLASSES = [
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
];

/**
 * Initials only — no fixture in the data model ever supplies a photo. Beyond
 * `max` writers the rest collapse into a "+N" chip rather than overflowing
 * the row.
 */
export function AvatarStack({
  assignees,
  max = 3,
}: {
  assignees: Assignee[];
  max?: number;
}) {
  if (assignees.length === 0) {
    return <span className="text-[12.5px] text-fg-faint">Not yet assigned</span>;
  }

  const shown = assignees.slice(0, max);
  const overflow = assignees.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((a, i) => (
        <span
          key={`${a.name}-${i}`}
          title={a.name}
          className={`-ml-1.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 border-surface text-[10.5px] font-semibold text-white first:ml-0 ${AVATAR_CLASSES[i % AVATAR_CLASSES.length]}`}
        >
          {initials(a.name)}
        </span>
      ))}
      {overflow > 0 && (
        <span className="-ml-1.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 border-surface bg-border-subtle font-mono text-[10.5px] font-semibold text-fg-muted">
          +{overflow}
        </span>
      )}
    </div>
  );
}
