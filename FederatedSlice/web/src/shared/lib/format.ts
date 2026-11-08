import { format, isValid, parseISO } from "@/shared/lib/date";

/**
 * 12 Mar 2026. A plain `YYYY-MM-DD` is a calendar day (`parseISO` reads it at
 * local midnight, not UTC), so it doesn't show as the day before west of UTC.
 */
export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? format(date, "dd MMM yyyy") : String(value);
}
