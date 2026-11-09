import { expect, it } from "vitest";

import { formatAmount, formatDate, formatDays, formatNumber, formatPercent } from "./format";

// West of UTC, where UTC midnight is still the day before.
process.env.TZ = "America/New_York";

it.each([
  ["2026-10-10", "10 Oct 2026"],
  ["2026-01-04", "04 Jan 2026"],
  // a real instant still shows in local time
  ["2026-10-10T02:00:00Z", "09 Oct 2026"],
  ["nope", "nope"],
])("%s → %s", (iso, expected) => {
  expect(formatDate(iso)).toBe(expected);
});

// Intl separates with no-break spaces: narrow (U+202F) for thousands, plain (U+00A0) before
// the symbol. Normalised to plain spaces here so the expectations stay readable.
const spaced = (value: string) => value.replace(/[  ]/g, " ");

it.each([
  [formatAmount(342917.1), "342 917,10 €"],
  [formatAmount(-5), "-5,00 €"],
  [formatNumber(12500), "12 500"],
  [formatPercent(72.5), "72,5 %"],
  [formatPercent(100), "100 %"],
  [formatDays(1), "1 day"],
  [formatDays(1500), "1 500 days"],
])("%s", (actual, expected) => {
  expect(spaced(actual)).toBe(expected);
});
