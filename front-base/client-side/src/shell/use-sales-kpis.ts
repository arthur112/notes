import { useMemo } from "react";
import { BadgeEuro, Boxes, Truck, Users, type LucideIcon } from "lucide-react";

import { buildFilter, useOrderTotals, type OrderTotals } from "@/shared/domain/orders";
import type {
  KpiDelta,
  KpiMetric,
  KpiProgress,
  KpiSentiment,
} from "@/shared/components/kpi-group-card";
import { addDaysYmd, todayYmd, yearStartYmd } from "@/shared/lib/date";
import { formatCompactCurrency } from "@/shared/lib/format";

/**
 * Dashboard KPIs: the platform's sales, grouped into four *semantic* tiles
 * (revenue, volume, customers, fulfilment) instead of four unrelated one-liners.
 * Each group is a list of related metrics, all compared year over year.
 *
 * Every group's headline also publishes a `progress` block — the two periods
 * scaled against the larger of them, plus a change figure — so the card can show
 * year-over-year progress as a shape, not only as a percentage.
 *
 * The badge and the meter's change text are always *different* representations of
 * the same movement, whichever way round the metric's unit makes sense: for a
 * money or count metric the badge is the relative change and the meter states the
 * absolute one; for a rate or share the badge is the absolute change in percentage
 * points and the meter states the relative one. Never the same number twice.
 *
 * No date picker — the scope is always "current calendar year so far" vs "the
 * same stretch of last year", which is the apples-to-apples comparison and needs
 * no user input.
 */

export type SalesGroup = {
  key: string;
  title: string;
  icon: LucideIcon;
  headline: KpiMetric;
  rows: KpiMetric[];
  /** Headline year-over-year meter. */
  progress?: KpiProgress;
};

export type SalesKpis = {
  groups: SalesGroup[];
  currentYear: number;
  previousYear: number;
  isError: boolean;
  refetch: () => void;
};

/** An aggregate plus the ratios a KPI group wants to show. */
type Derived = OrderTotals & {
  aov: number;
  unitsPerOrder: number;
  avgUnitPrice: number;
  ordersPerCustomer: number;
  netPerCustomer: number;
  unitsPerCustomer: number;
  fulfilmentRate: number;
  openCount: number;
};

function derive(totals: OrderTotals): Derived {
  return {
    ...totals,
    aov: totals.count > 0 ? totals.subtotal / totals.count : 0,
    unitsPerOrder: totals.count > 0 ? totals.units / totals.count : 0,
    avgUnitPrice: totals.units > 0 ? totals.subtotal / totals.units : 0,
    ordersPerCustomer: totals.customers > 0 ? totals.count / totals.customers : 0,
    netPerCustomer: totals.customers > 0 ? totals.subtotal / totals.customers : 0,
    unitsPerCustomer: totals.customers > 0 ? totals.units / totals.customers : 0,
    fulfilmentRate:
      totals.count > 0 ? (totals.byStatus.delivered + totals.byStatus.shipped) / totals.count : 0,
    openCount: totals.byStatus.pending + totals.byStatus.confirmed,
  };
}

const fmtInt = (n: number): string => Math.round(n).toLocaleString("en-IE");
const fmt1 = (n: number): string => n.toLocaleString("en-IE", { maximumFractionDigits: 1 });
const fmtPct = (n: number): string => `${fmt1(n * 100)}%`;
const shareOf = (d: Derived, n: number): number => (d.count > 0 ? n / d.count : 0);

/** `+`/`-` in front of a body text. */
const withSign = (n: number, body: string): string => {
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return body;
};

const signedCurrency = (delta: number): string =>
  withSign(delta, formatCompactCurrency(Math.abs(delta)));
const signedInt = (delta: number): string => withSign(delta, fmtInt(Math.abs(delta)));
const signedOne = (delta: number): string => withSign(delta, fmt1(Math.abs(delta)));

/**
 * Relative change of a rate or share, e.g. `+7.3%`. `undefined` when the baseline
 * is zero, because "how much more than nothing" has no answer.
 */
function relativeChange(now: number, before: number): string | undefined {
  if (before === 0) return undefined;
  return withSign(now - before, `${fmt1(Math.abs((now - before) / before) * 100)}%`);
}

type MetricSpec = {
  key: string;
  label: string;
  pick: (d: Derived) => number;
  format: (d: Derived) => string;
  /** The change text shown beside the meter — the complement of the delta badge. */
  formatChange: (current: number, previous: number) => string | undefined;
  /** `points` for shares/rates (percentage-point delta), `percent` otherwise. */
  unit?: "percent" | "points";
  sentiment?: KpiSentiment;
};

/** Build one group's metrics (headline first) from the current/previous aggregates. */
function buildMetrics(
  specs: MetricSpec[],
  current: Derived | undefined,
  previous: Derived | undefined,
): KpiMetric[] {
  return specs.map((spec) => {
    const value = current ? spec.pick(current) : undefined;
    const baseline = previous ? spec.pick(previous) : undefined;

    let delta: KpiDelta = null;
    if (value !== undefined && baseline !== undefined) {
      if (spec.unit === "points") {
        delta = { value: (value - baseline) * 100, unit: "points" };
      } else if (baseline !== 0) {
        delta = { value: ((value - baseline) / baseline) * 100, unit: "percent" };
      }
    }

    return {
      key: spec.key,
      label: spec.label,
      value: value === undefined || !current ? undefined : spec.format(current),
      delta,
      sentiment: spec.sentiment,
    };
  });
}

const REVENUE: MetricSpec[] = [
  {
    key: "net",
    label: "Net sales",
    pick: (d) => d.subtotal,
    format: (d) => formatCompactCurrency(d.subtotal),
    formatChange: (now, before) => signedCurrency(now - before),
  },
  {
    key: "vat",
    label: "VAT",
    pick: (d) => d.tax,
    format: (d) => formatCompactCurrency(d.tax),
    formatChange: (now, before) => signedCurrency(now - before),
  },
  {
    key: "billed",
    label: "Total billed",
    pick: (d) => d.total,
    format: (d) => formatCompactCurrency(d.total),
    formatChange: (now, before) => signedCurrency(now - before),
  },
  {
    key: "aov",
    label: "Avg. order value",
    pick: (d) => d.aov,
    format: (d) => formatCompactCurrency(d.aov),
    formatChange: (now, before) => signedCurrency(now - before),
  },
];

const VOLUME: MetricSpec[] = [
  {
    key: "orders",
    label: "Orders",
    pick: (d) => d.count,
    format: (d) => fmtInt(d.count),
    formatChange: (now, before) => signedInt(now - before),
  },
  {
    key: "units",
    label: "Units sold",
    pick: (d) => d.units,
    format: (d) => fmtInt(d.units),
    formatChange: (now, before) => signedInt(now - before),
  },
  {
    key: "units-per-order",
    label: "Units / order",
    pick: (d) => d.unitsPerOrder,
    format: (d) => fmt1(d.unitsPerOrder),
    formatChange: (now, before) => signedOne(now - before),
  },
  {
    key: "unit-price",
    label: "Avg. unit price",
    pick: (d) => d.avgUnitPrice,
    format: (d) => formatCompactCurrency(d.avgUnitPrice),
    formatChange: (now, before) => signedCurrency(now - before),
  },
];

const CUSTOMERS: MetricSpec[] = [
  {
    key: "active",
    label: "Active customers",
    pick: (d) => d.customers,
    format: (d) => fmtInt(d.customers),
    formatChange: (now, before) => signedInt(now - before),
  },
  {
    key: "orders-per-customer",
    label: "Orders / customer",
    pick: (d) => d.ordersPerCustomer,
    format: (d) => fmt1(d.ordersPerCustomer),
    formatChange: (now, before) => signedOne(now - before),
  },
  {
    key: "net-per-customer",
    label: "Revenue / customer",
    pick: (d) => d.netPerCustomer,
    format: (d) => formatCompactCurrency(d.netPerCustomer),
    formatChange: (now, before) => signedCurrency(now - before),
  },
  {
    key: "units-per-customer",
    label: "Units / customer",
    pick: (d) => d.unitsPerCustomer,
    format: (d) => fmt1(d.unitsPerCustomer),
    formatChange: (now, before) => signedOne(now - before),
  },
];

const FULFILMENT: MetricSpec[] = [
  {
    key: "fulfilment-rate",
    label: "Fulfilment rate",
    pick: (d) => d.fulfilmentRate,
    format: (d) => fmtPct(d.fulfilmentRate),
    formatChange: relativeChange,
    unit: "points",
  },
  {
    key: "delivered",
    label: "Delivered",
    pick: (d) => shareOf(d, d.byStatus.delivered),
    format: (d) => `${fmtInt(d.byStatus.delivered)} · ${fmtPct(shareOf(d, d.byStatus.delivered))}`,
    formatChange: relativeChange,
    unit: "points",
  },
  {
    key: "shipped",
    label: "Shipped",
    pick: (d) => shareOf(d, d.byStatus.shipped),
    format: (d) => `${fmtInt(d.byStatus.shipped)} · ${fmtPct(shareOf(d, d.byStatus.shipped))}`,
    formatChange: relativeChange,
    unit: "points",
  },
  {
    key: "open",
    label: "Open",
    pick: (d) => shareOf(d, d.openCount),
    format: (d) => `${fmtInt(d.openCount)} · ${fmtPct(shareOf(d, d.openCount))}`,
    formatChange: relativeChange,
    unit: "points",
    sentiment: "neutral",
  },
  {
    key: "cancelled",
    label: "Cancelled",
    pick: (d) => shareOf(d, d.byStatus.cancelled),
    format: (d) => `${fmtInt(d.byStatus.cancelled)} · ${fmtPct(shareOf(d, d.byStatus.cancelled))}`,
    formatChange: relativeChange,
    unit: "points",
    sentiment: "down-good",
  },
];

/** A group's identity plus the metrics it shows (headline first). */
type GroupSpec = {
  key: string;
  title: string;
  icon: LucideIcon;
  specs: MetricSpec[];
};

const GROUPS: GroupSpec[] = [
  { key: "revenue", title: "Revenue", icon: BadgeEuro, specs: REVENUE },
  { key: "volume", title: "Volume", icon: Boxes, specs: VOLUME },
  { key: "customers", title: "Customers", icon: Users, specs: CUSTOMERS },
  { key: "fulfilment", title: "Fulfilment", icon: Truck, specs: FULFILMENT },
];

/** The two calendar years the comparison spans. */
type Period = { currentYear: number; previousYear: number };

/** The two periods scaled against the larger of them, plus the change text. */
function buildProgress(
  spec: MetricSpec,
  current: Derived | undefined,
  previous: Derived | undefined,
  period: Period,
): KpiProgress | undefined {
  if (!current || !previous) return undefined;

  const now = spec.pick(current);
  const before = spec.pick(previous);
  const max = Math.max(now, before, Number.EPSILON);

  return {
    currentShare: now / max,
    previousShare: before / max,
    currentLabel: String(period.currentYear),
    previousLabel: String(period.previousYear),
    change: spec.formatChange(now, before),
  };
}

/**
 * The dashboard's view model, built from the two year aggregates. Pure and
 * exported so it can be exercised without React.
 */
export function buildSalesGroups(
  current: OrderTotals | undefined,
  previous: OrderTotals | undefined,
  currentYear: number,
  previousYear: number,
): SalesGroup[] {
  const cur = current ? derive(current) : undefined;
  const prev = previous ? derive(previous) : undefined;
  const period: Period = { currentYear, previousYear };

  return GROUPS.map((group) => {
    const [headline, ...rows] = buildMetrics(group.specs, cur, prev);
    return {
      key: group.key,
      title: group.title,
      icon: group.icon,
      headline,
      rows,
      progress: buildProgress(group.specs[0], cur, prev, period),
    };
  });
}

/** `createdAt` in [Jan 1 of `year`, `toExclusive`) — inclusive of the current day. */
function yearToDateFilter(year: number, toExclusive: string): string {
  return buildFilter([
    [{ field: "createdAt", op: "gte", value: yearStartYmd(year) }],
    [{ field: "createdAt", op: "lt", value: toExclusive }],
  ]);
}

export function useSalesKpis(): SalesKpis {
  const { currentYear, previousYear, currentFilter, previousFilter } = useMemo(() => {
    const today = todayYmd();
    const year = Number(today.slice(0, 4));
    const monthDay = today.slice(4); // "-MM-DD"
    return {
      currentYear: year,
      previousYear: year - 1,
      // Exclusive upper bound = tomorrow, so today's orders are included.
      currentFilter: yearToDateFilter(year, addDaysYmd(today, 1)),
      previousFilter: yearToDateFilter(year - 1, addDaysYmd(`${year - 1}${monthDay}`, 1)),
    };
  }, []);

  const current = useOrderTotals(currentFilter);
  const previous = useOrderTotals(previousFilter);

  return {
    groups: buildSalesGroups(current.data, previous.data, currentYear, previousYear),
    currentYear,
    previousYear,
    isError: current.isError || previous.isError,
    refetch: () => {
      void current.refetch();
      void previous.refetch();
    },
  };
}
