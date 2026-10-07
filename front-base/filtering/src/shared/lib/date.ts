/** Dates travel as UTC `YYYY-MM-DD` strings so comparisons stay lexicographic-safe. */
export type Ymd = string; // YYYY-MM-DD

export function toYmd(date: Date): Ymd {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayYmd(): Ymd {
  return toYmd(new Date());
}

/** `ymd + n days`, keeping everything UTC to avoid timezone drift. */
export function addDaysYmd(ymd: Ymd, n: number): Ymd {
  const [y, m, d] = ymd.split("-").map(Number);
  return toYmd(new Date(Date.UTC(y, m - 1, d + n)));
}
