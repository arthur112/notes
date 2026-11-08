import { expect, it } from "vitest";

import { formatDate } from "./format";

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
