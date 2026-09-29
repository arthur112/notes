/**
 * App-local formatting helpers. Dates travel as `YYYY-MM-DD` strings (see
 * `shared/lib/date.ts`) and render here as `DD/MM/YYYY` — the lending desk's
 * convention, distinct from the order apps' "12 Mar 2026".
 */

/** `2025-12-01` → `01/12/2025` (passes through anything that isn't YMD). */
export function formatDmy(ymd: string): string {
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/** 4.8 → `4.80%`, 85.6 → `85.6%`. */
export function formatPct(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

const eurWhole = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** €342,917.14 → `€342,917` — for headline stats where cents are noise. */
export function formatCurrencyWhole(value: number): string {
  return eurWhole.format(value);
}
