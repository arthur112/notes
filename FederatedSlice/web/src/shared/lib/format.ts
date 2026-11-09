import { format, isValid, parseISO } from "@/shared/lib/date";

const amount = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 342917.1 → `342,917.10`. Orders carry no currency, so neither does this. */
export function formatAmount(value: number): string {
  return amount.format(value);
}

/**
 * 12 Mar 2026. A plain `YYYY-MM-DD` is a calendar day (`parseISO` reads it at
 * local midnight, not UTC), so it doesn't show as the day before west of UTC.
 */
export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? format(date, "dd MMM yyyy") : String(value);
}
