import { useState, type ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import type { OrderOverview as Overview, OrderStatus } from "@/api/orders";
import { Button } from "@/shared/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { differenceInCalendarDays, parseISO } from "@/shared/lib/date";
import {
  formatAmount,
  formatDate,
  formatDays,
  formatNumber,
  formatPercent,
} from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

import { orderOverviewQueryOptions } from "../use-orders";

import { mockModifications, type Modification } from "./modifications";
import { orDash, RecordSection, Separator, SpecGroup, SpecRow, StatStrip } from "./record-layout";
import { RiskSummary } from "./risk-grade-scale";

const STATUS_DOT: Record<OrderStatus, string> = {
  Pending: "bg-amber-500",
  Paid: "bg-emerald-500",
  Shipped: "bg-sky-500",
  Delivered: "bg-emerald-700",
  Cancelled: "bg-muted-foreground",
};

const yesNo = (value: boolean) => (value ? "Yes" : "No");
/** The payment term: order date to due date. */
const termDays = (order: Overview) =>
  differenceInCalendarDays(parseISO(order.dueDate), parseISO(order.createdAt));

const mono = (value: string) => <span className="font-mono">{value}</span>;

/**
 * A hero titled by the order N°, the customer under it, then the key facts in two lines: references,
 * then dates. Mirrors a loan-insurance contract header: order N° ≈ loan N°, customer N° ≈ branch
 * N°, customer reference ≈ branch reference, booked ≈ booking date, due ≈ effective date, term ≈
 * duration.
 */
function Hero({ order, action }: { order: Overview; action?: ReactNode }) {
  const factLines: [label: string, value: ReactNode][][] = [
    [
      ["Customer N°", mono(order.customer.customerNo)],
      ["Ref.", order.reference && mono(order.reference)],
    ],
    [
      ["Booked", formatDate(order.createdAt)],
      ["Due", formatDate(order.dueDate)],
      ["Term", formatDays(termDays(order))],
    ],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h1 className="font-mono text-3xl font-semibold tracking-tight">{order.orderNo}</h1>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[order.status])} />
              {order.status}
            </span>
          </div>
          <p className="mt-1 text-lg">{order.customer.name}</p>
        </div>
        {action}
      </div>
      <div className="space-y-1.5">
        {factLines.map((facts) => (
          <dl key={facts[0][0]} className="flex flex-wrap gap-x-6 gap-y-1">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {label}
                </dt>
                <dd className="text-sm font-medium tabular-nums">{orDash(value)}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </div>
  );
}

const joinOrNone = (items: string[]) => (items.length > 0 ? items.join(" · ") : "None");

/** "Active · Verified · VIP": the customer's flags in one row, the negatives named too. */
const standing = ({ active, isVerified, isVip }: Overview["customer"]) =>
  [active ? "Active" : "Inactive", isVerified ? "Verified" : "Unverified", isVip && "VIP"]
    .filter(Boolean)
    .join(" · ");

/**
 * The order as placed: six groups in two columns, read in rows: terms beside risk and value (the
 * decision pair), customer beside credit, lines beside the rules that shaped the order.
 */
function OrderDetails({ order }: { order: Overview }) {
  const { customer, risk } = order;
  const units = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <RecordSection id="order-details" title="Order" note={`Placed ${formatDate(order.createdAt)}`}>
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        <SpecGroup title="Order terms">
          <SpecRow label="Order date" value={formatDate(order.createdAt)} />
          <SpecRow label="Due date" value={formatDate(order.dueDate)} />
          <SpecRow label="Term" value={formatDays(termDays(order))} />
          <SpecRow label="Customer payment terms" value={formatDays(customer.paymentTermsDays)} />
          <SpecRow label="Customer reference" value={order.reference && mono(order.reference)} />
        </SpecGroup>

        <SpecGroup title="Risk & value">
          <RiskSummary
            grade={risk.grade}
            band={risk.band}
            activeIndex={risk.gradeIndex}
            label={`${risk.grade} (${risk.band})`}
            value={order.value.score}
            valueBand={order.value.band}
          />
          <SpecRow label="Days past due" value={formatNumber(risk.daysPastDue)} />
          <SpecRow label="Risk factors" value={joinOrNone(risk.factors)} />
          <SpecRow label="Value drivers" value={joinOrNone(order.value.drivers)} />
        </SpecGroup>

        <SpecGroup title="Customer">
          <SpecRow label="Customer N°" value={mono(customer.customerNo)} />
          <SpecRow label="Segment" value={customer.segment} />
          <SpecRow label="Country" value={customer.country} />
          <SpecRow label="Billing email" value={customer.email} />
          <SpecRow label="Customer since" value={formatDate(customer.since)} />
          <SpecRow label="Standing" value={standing(customer)} />
        </SpecGroup>

        <SpecGroup title="Credit">
          <SpecRow label="Credit limit" value={formatAmount(customer.creditLimit)} />
          <SpecRow label="Open exposure" value={formatAmount(risk.openExposure)} />
          <SpecRow label="Limit in use" value={formatPercent(risk.creditUsedPct)} />
          <SpecRow
            label="Headroom"
            value={formatAmount(Math.max(0, customer.creditLimit - risk.openExposure))}
          />
          <SpecRow label="Credit hold" value={yesNo(customer.isOnHold)} />
        </SpecGroup>

        <SpecGroup title="Lines">
          {order.lines.map((line, index) => (
            <SpecRow
              // Lines have no id; the same product may appear twice.
              key={index}
              label={`${formatNumber(line.quantity)} × ${line.product} @ ${formatAmount(line.unitPrice)}`}
              value={formatAmount(line.quantity * line.unitPrice)}
            />
          ))}
          <SpecRow
            className="border-t font-semibold"
            label={`Total · ${formatNumber(units)} units`}
            value={formatAmount(order.total)}
          />
        </SpecGroup>

        <SpecGroup title="Order rules">
          <SpecRow label="Initial status" value={customer.initialStatus ?? "As entered"} />
          <SpecRow
            label="Forced due date"
            value={
              customer.forcedDueDays === null
                ? "As entered"
                : `${formatDays(customer.forcedDueDays)} after order`
            }
          />
          <SpecRow label="Reference on customer change" value="Dropped unless re-entered" />
        </SpecGroup>
      </div>
    </RecordSection>
  );
}

/** Modifications shown before "View more": the rest expand in place. */
const VISIBLE_MODIFICATIONS = 3;

function ModificationList({ modifications }: { modifications: Modification[] }) {
  return (
    <ul>
      {modifications.map((mod) => (
        <li
          key={`${mod.date}-${mod.kind}`}
          className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm"
        >
          <time className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatDate(mod.date)}
          </time>
          <span>
            <span className="font-semibold">{mod.kind}</span>
            <span className="text-muted-foreground">
              {" "}
              — {mod.description} · {mod.agent}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The log, most recent first: the latest few shown, the rest expanding in place. */
function Modifications({ modifications }: { modifications: Modification[] }) {
  const [open, setOpen] = useState(false);
  const recent = modifications.slice(0, VISIBLE_MODIFICATIONS);
  const older = modifications.slice(VISIBLE_MODIFICATIONS);

  return (
    <RecordSection
      id="order-modifications"
      title="Modifications"
      note={`${modifications.length} entries · most recent first`}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <ModificationList modifications={recent} />
        <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
          <ModificationList modifications={older} />
        </CollapsibleContent>
        {older.length > 0 && (
          <CollapsibleTrigger render={<Button variant="link" className="h-auto p-0 text-sm" />}>
            {open ? "View less" : `View ${older.length} more`}
            <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
          </CollapsibleTrigger>
        )}
      </Collapsible>
    </RecordSection>
  );
}

/**
 * What the order still owes as of the server's today, six figures in two rows of three: the
 * schedule's two (remaining term, scheduled balance), then arrears, interest, entry into risk and
 * provision, each "—" until it exists so every figure keeps its place. Those that exist are toned
 * amber (late) or red (at risk). Then the credit-hold banner.
 */
function CurrentState({ order }: { order: Overview }) {
  const { customer, risk, receivable: owed } = order;
  const tone =
    owed.atRiskSince != null
      ? "text-red-600 dark:text-red-400"
      : "text-amber-600 dark:text-amber-400";
  /** A dash stays neutral: only a figure that exists is toned. */
  const toned = (value: unknown) => (value == null ? undefined : tone);

  return (
    <RecordSection
      id="order-current-state"
      title="Current state"
      note={`As of ${formatDate(order.asOf)}`}
    >
      {/* null, not `false`: the strip dashes a null value and skips a null hint. */}
      <StatStrip
        className="md:grid-cols-3"
        stats={[
          {
            label: "Remaining term",
            value: formatDays(owed.remainingDays),
            hint: `of ${formatDays(termDays(order))} · due ${formatDate(order.dueDate)}`,
          },
          {
            label: "Scheduled balance",
            value: formatAmount(owed.scheduledBalance),
            hint:
              order.status === "Pending"
                ? "Awaiting payment"
                : order.status === "Cancelled"
                  ? "Nothing owed"
                  : "Settled",
          },
          {
            label: "Overdue",
            value: owed.overdue == null ? null : formatAmount(owed.overdue),
            hint: owed.overdue == null ? null : `${formatDays(risk.daysPastDue)} past due`,
            className: toned(owed.overdue),
          },
          {
            label: "Late interest",
            value: owed.lateInterest == null ? null : formatAmount(owed.lateInterest),
            hint: owed.lateInterest == null ? null : `Accruing since ${formatDate(order.dueDate)}`,
            className: toned(owed.lateInterest),
          },
          {
            label: "At risk since",
            value: owed.atRiskSince == null ? null : formatDate(owed.atRiskSince),
            hint:
              owed.atRiskSince == null
                ? null
                : `${formatDays(differenceInCalendarDays(parseISO(order.asOf), parseISO(owed.atRiskSince)))} ago`,
            className: toned(owed.atRiskSince),
          },
          {
            label: "Provision",
            value: owed.provision == null ? null : formatAmount(owed.provision),
            hint:
              owed.provision && owed.overdue
                ? `${formatPercent((owed.provision / owed.overdue) * 100)} of overdue`
                : null,
            className: toned(owed.provision),
          },
        ]}
      />

      {customer.isOnHold && (
        <>
          <Separator />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-amber-500" />
            <span className="font-semibold">Credit hold · {customer.customerNo}</span>
            <span className="text-muted-foreground">
              — no order for {customer.name} can be saved until the hold is lifted
            </span>
          </div>
        </>
      )}
    </RecordSection>
  );
}

/**
 * An order's record page: hero, the order as placed (with its risk grade on the
 * A–F scale), its current state, then its modifications. The route's loader awaited the overview
 * (`orderOverviewRouteLoader`). `action` is the app's: only it knows its routes.
 */
export function OrderOverview({ orderNo, action }: { orderNo: string; action?: ReactNode }) {
  const { data: order } = useSuspenseQuery(orderOverviewQueryOptions(orderNo));
  return (
    <div className="mx-auto max-w-5xl space-y-12 p-6">
      <Hero order={order} action={action} />
      <OrderDetails order={order} />
      <CurrentState order={order} />
      <Modifications modifications={mockModifications(order)} />
    </div>
  );
}
