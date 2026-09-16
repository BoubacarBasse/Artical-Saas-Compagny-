/**
 * Date and text formatting shared across pages.
 *
 * Dates in the data model are ISO — either a bare `YYYY-MM-DD` (deadlines) or
 * a full timestamp (createdAt/updatedAt, event timestamps). Both are accepted
 * here so a caller never has to know which shape it has.
 */

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dateParts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
}

/** "Sep 25" */
export function formatDateShort(iso: string | null): string {
  if (!iso) return "—";
  const [, m, d] = dateParts(iso);
  return `${MONTH_LABELS[m - 1]} ${d}`;
}

/** "September 25, 2026" */
export function formatDateLong(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = dateParts(iso);
  return `${MONTH_LABELS[m - 1]} ${d}, ${y}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Falls back to the email's local part when no display name is set yet. */
export function profileInitials(fullName: string | null, email: string): string {
  if (fullName && fullName.trim()) return initials(fullName);
  return email.slice(0, 2).toUpperCase();
}

export function greeting(fullName: string | null): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? `${time}, ${first}` : time;
}

/** Splits the deliverable filename so the extension never truncates away. */
export function splitFilename(filename: string): { stem: string; ext: string } {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return { stem: filename, ext: "" };
  return { stem: filename.slice(0, dot), ext: filename.slice(dot) };
}
