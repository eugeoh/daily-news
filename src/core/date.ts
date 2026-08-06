/** Formats using local date parts (not `toISOString()`, which can shift the
 * day when the source's date string carries no timezone of its own). */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
