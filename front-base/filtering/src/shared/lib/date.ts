/** Dates travel as `YYYY-MM-DD` strings so comparisons stay lexicographic-safe. */
export type Ymd = string; // YYYY-MM-DD

export function toYmd(date: Date): Ymd {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today in the browser's time zone, so the calendar turns over at local midnight, not UTC. */
export function todayYmd(): Ymd {
  const now = new Date();
  return toYmd(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/** `ymd + n days`, keeping everything UTC to avoid timezone drift. */
export function addDaysYmd(ymd: Ymd, n: number): Ymd {
  const [y, m, d] = ymd.split("-").map(Number);
  return toYmd(new Date(Date.UTC(y, m - 1, d + n)));
}

/**
 * The UTC instant `ymd` starts at in the browser's time zone, in ISO 8601 (`2024-01-01` →
 * `2023-12-31T23:00:00Z` in Brussels, `2024-01-01T05:00:00Z` in New York): what .NET binds
 * to a UTC `DateTime`.
 */
export function ymdToUtcIso(ymd: Ymd): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString().replace(".000Z", "Z");
}
