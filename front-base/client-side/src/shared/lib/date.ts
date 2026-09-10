/** Calendar/date helpers shared by filters and pickers. All dates travel as
 *  `YYYY-MM-DD` strings (UTC) so comparisons stay lexicographic-safe when a
 *  `YYYY-MM-DD` boundary is compared against a full `YYYY-MM-DDTHH:mm:ss.sssZ`
 *  timestamp (a boundary sorts before any instant of its own day). */

/** A (year, month) pair — `month` is 0-based like `Date#getMonth()`. */
export type Month = { year: number; month: number };

export type Ymd = string; // YYYY-MM-DD

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatMonth(m: Month): string {
  return `${MONTH_NAMES_SHORT[m.month]} ${m.year}`;
}

export function toYmd(date: Date): Ymd {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayYmd(): Ymd {
  return toYmd(new Date());
}

/** First day of `m` as YYYY-MM-DD. */
export function monthStartYmd(m: Month): Ymd {
  return `${m.year}-${String(m.month + 1).padStart(2, "0")}-01`;
}

/** First day of the month AFTER `m` — the exclusive upper bound of a month range. */
export function nextMonthStartYmd(m: Month): Ymd {
  const y = m.month === 11 ? m.year + 1 : m.year;
  const mo = m.month === 11 ? 0 : m.month + 1;
  return `${y}-${String(mo + 1).padStart(2, "0")}-01`;
}

/** `ymd + n days`, keeping everything UTC to avoid timezone drift. */
export function addDaysYmd(ymd: Ymd, n: number): Ymd {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return toYmd(date);
}

/** First day of `year` as YYYY-MM-DD. */
export function yearStartYmd(year: number): Ymd {
  return `${year}-01-01`;
}

export function currentMonth(): Month {
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}
