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
import { formatAmount, formatDate } from "@/shared/lib/format";
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

const STATUS_HINT: Record<OrderStatus, string> = {
  Pending: "Awaiting payment",
  Paid: "Waiting to ship",
  Shipped: "In transit",
  Delivered: "Complete",
  Cancelled: "Closed",
};

const days = (n: number) => `${n} ${n === 1 ? "day" : "days"}`;
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
      ["Term", days(termDays(order))],
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
          <SpecRow label="Term" value={days(termDays(order))} />
          <SpecRow label="Customer payment terms" value={days(customer.paymentTermsDays)} />
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
          <SpecRow label="Days past due" value={risk.daysPastDue} />
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
          <SpecRow label="Limit in use" value={`${risk.creditUsedPct}%`} />
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
              label={`${line.quantity} × ${line.product} @ ${formatAmount(line.unitPrice)}`}
              value={formatAmount(line.quantity * line.unitPrice)}
            />
          ))}
          <SpecRow
            className="border-t font-semibold"
            label={`Total · ${units} units`}
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
                : `${days(customer.forcedDueDays)} after order`
            }
          />
          <SpecRow label="Reference on customer change" value="Dropped unless re-entered" />
        </SpecGroup>
      </div>
    </RecordSection>
  );
}

function paymentStat(order: Overview) {
  if (order.status === "Cancelled") return "Not due";
  if (order.status !== "Pending") return "Received";
  if (order.risk.daysPastDue > 0) return `${days(order.risk.daysPastDue)} late`;
  return `Due in ${days(differenceInCalendarDays(parseISO(order.dueDate), parseISO(order.asOf)))}`;
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

/** Live figures as of the server's today and the credit-hold banner. */
function CurrentState({ order }: { order: Overview }) {
  const { customer, risk } = order;
  return (
    <RecordSection
      id="order-current-state"
      title="Current state"
      note={`As of ${formatDate(order.asOf)}`}
    >
      <StatStrip
        stats={[
          {
            label: "Status",
            value: order.status,
            hint: STATUS_HINT[order.status],
          },
          {
            label: "Payment",
            value: paymentStat(order),
            hint: `Due ${formatDate(order.dueDate)}`,
          },
          {
            label: "Open exposure",
            value: formatAmount(risk.openExposure),
            hint: `${risk.creditUsedPct}% of ${formatAmount(customer.creditLimit)} limit`,
          },
          {
            label: "Credit headroom",
            value: formatAmount(Math.max(0, customer.creditLimit - risk.openExposure)),
            hint: `${days(customer.paymentTermsDays)} payment terms`,
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
