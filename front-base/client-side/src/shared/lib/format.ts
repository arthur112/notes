/** Formatting helpers shared across apps (currency, dates). */

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

export function formatCurrency(value: number): string {
  return eur.format(value);
}

const eurCompact = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** €1,234,567 → "€1.2M" — for KPI tiles where the magnitude matters more than cents. */
export function formatCompactCurrency(value: number): string {
  return eurCompact.format(value);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function safeParse(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 12 Mar 2026 */
export function formatDate(iso: string): string {
  const d = safeParse(iso);
  return d ? dateFmt.format(d) : iso;
}

/** 12 Mar 2026, 14:05 */
export function formatDateTime(iso: string): string {
  const d = safeParse(iso);
  return d ? dateTimeFmt.format(d) : iso;
}

/** Round to cents, guarding against floating point drift. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
