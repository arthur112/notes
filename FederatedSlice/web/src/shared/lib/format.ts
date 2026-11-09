import { format, isValid, parseISO } from "@/shared/lib/date";

/**
 * European figures for every number on screen: comma decimals, (narrow) space thousands, the
 * symbol after. Only the separators: the UI's words stay English.
 */
const LOCALE = "fr-FR";

const amount = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const number = new Intl.NumberFormat(LOCALE);
const percent = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 1 });

/** 342917.1 → `342 917,10 €`. */
export function formatAmount(value: number): string {
  return amount.format(value);
}

/** 12500 → `12 500`. */
export function formatNumber(value: number): string {
  return number.format(value);
}

/** Percentage points, as the API sends them: 72.5 → `72,5 %`. */
export function formatPercent(points: number): string {
  return percent.format(points / 100);
}

/** 1 → `1 day`, 30 → `30 days`: European figure, English word (an Intl unit would say "jours"). */
export function formatDays(value: number): string {
  return `${formatNumber(value)} ${value === 1 ? "day" : "days"}`;
}

/**
 * 12 Mar 2026, or "—" when there is no date. A plain `YYYY-MM-DD` is a calendar day
 * (`parseISO` reads it at local midnight, not UTC), so it doesn't show as the day before
 * west of UTC.
 */
export function formatDate(value: Date | string | null | undefined): string {
  if (value == null) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return isValid(date) ? format(date, "dd MMM yyyy") : String(value);
}
