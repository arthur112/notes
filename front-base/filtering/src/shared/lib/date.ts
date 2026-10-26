import { format } from "date-fns/format";
import { formatISO } from "date-fns/formatISO";
import { isValid } from "date-fns/isValid";
import { parse } from "date-fns/parse";
import { parseISO } from "date-fns/parseISO";

/**
 * The app's date-fns, one subpath per function: the `date-fns` root barrel
 * loads every function, which slows the tests' imports. Import from here.
 */
export { addMonths } from "date-fns/addMonths";
export { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
export { eachDayOfInterval } from "date-fns/eachDayOfInterval";
export { endOfMonth } from "date-fns/endOfMonth";
export { getISODay } from "date-fns/getISODay";
export { isSameDay } from "date-fns/isSameDay";
export { isSameMonth } from "date-fns/isSameMonth";
export { isThisMonth } from "date-fns/isThisMonth";
export { isToday } from "date-fns/isToday";
export { setMonth } from "date-fns/setMonth";
export { startOfMonth } from "date-fns/startOfMonth";
export { format, formatISO, isValid, parse, parseISO };

/** A day in the URL: `dd-MM-yyyy`, the European order (`20-03-2025`). */
export type UrlDay = string;

const URL_DAY = "dd-MM-yyyy";

export function toUrlDay(date: Date): UrlDay {
  return format(date, URL_DAY);
}

/** The local-midnight `Date` of `day`; an Invalid Date when it isn't `dd-MM-yyyy`. */
export function fromUrlDay(day: UrlDay): Date {
  return parse(day, URL_DAY, new Date());
}

/** `date`'s calendar day as the API's `YYYY-MM-DD`. */
export function toIsoDay(date: Date): string {
  return formatISO(date, { representation: "date" });
}

/** The first instant of `day` as a UTC day, in ISO 8601 (`2024-01-01T00:00:00Z`). */
export function startOfDayIso(day: UrlDay): string {
  return `${toIsoDay(fromUrlDay(day))}T00:00:00Z`;
}

/** The last instant of `day` as a UTC day, in ISO 8601 (`2024-01-31T23:59:59.999Z`). */
export function endOfDayIso(day: UrlDay): string {
  return `${toIsoDay(fromUrlDay(day))}T23:59:59.999Z`;
}
