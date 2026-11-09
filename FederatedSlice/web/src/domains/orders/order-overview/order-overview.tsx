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
import { RecordSection, Separator, SpecGroup, SpecRow, StatStrip } from "./record-layout";
import { RiskGradeScale } from "./risk-grade-scale";

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
const mono = (value: string) => <span className="font-mono">{value}</span>;
/** The payment term: order date to due date. */
const termDays = (order: Overview) =>
  differenceInCalendarDays(parseISO(order.dueDate), parseISO(order.createdAt));

/**
 * Identity (customer, status), then the record's three references and its three dates. Mirrors a
 * loan-insurance contract header: order N° ≈ loan N°, customer N° ≈ branch N°, customer reference
 * ≈ branch reference, order date ≈ booking date, due date ≈ effective date, term ≈ duration.
 */
function Hero({ order, action }: { order: Overview; action?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{order.customer.name}</h1>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <span aria-hidden className={cn("size-2 rounded-full", STATUS_DOT[order.status])} />
            {order.status}
          </span>
        </div>
        {action}
      </div>
      <Separator />
      <StatStrip
        columns={3}
        stats={[
          { label: "Order N°", value: mono(order.orderNo) },
          { label: "Customer N°", value: mono(order.customer.customerNo) },
          { label: "Customer reference", value: order.reference ? mono(order.reference) : "—" },
          { label: "Order date", value: formatDate(order.createdAt) },
          { label: "Due date", value: formatDate(order.dueDate) },
          { label: "Term", value: days(termDays(order)) },
        ]}
      />
    </div>
  );
}

/** The order as placed, its customer and its risk: four groups, two columns. */
function OrderDetails({ order }: { order: Overview }) {
  const { customer, risk } = order;
  const units = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <RecordSection id="order-details" title="Order" note={`Placed ${formatDate(order.createdAt)}`}>
      <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        <SpecGroup title="Order terms">
          <SpecRow label="Order date" value={formatDate(order.createdAt)} />
          <SpecRow
            label="Due date"
            value={`${formatDate(order.dueDate)} · ${days(termDays(order))} after order`}
          />
          <SpecRow label="Customer payment terms" value={days(customer.paymentTermsDays)} />
          <SpecRow
            label="Customer reference"
            value={<span className="font-mono text-xs">{order.reference ?? "—"}</span>}
          />
          <SpecRow label="Lines" value={`${order.lines.length} lines · ${units} units`} />
          <SpecRow label="Total" value={formatAmount(order.total)} />
        </SpecGroup>

        <SpecGroup title="Risk assessment">
          <SpecRow label="Risk grade" value={`${risk.grade} · ${risk.band}`} />
          <RiskGradeScale activeIndex={risk.gradeIndex} label={`${risk.grade} (${risk.band})`} />
          <SpecRow label="Days past due" value={risk.daysPastDue} />
          <SpecRow
            label="Open exposure"
            value={`${formatAmount(risk.openExposure)} · ${risk.creditUsedPct}% of limit`}
          />
          <SpecRow label="Credit limit" value={formatAmount(customer.creditLimit)} />
          <SpecRow
            label="Factors"
            value={risk.factors.length > 0 ? risk.factors.join(" · ") : "None"}
          />
        </SpecGroup>

        <SpecGroup title="Customer">
          <SpecRow
            label="Customer N°"
            value={<span className="font-mono text-xs">{customer.customerNo}</span>}
          />
          <SpecRow label="Segment" value={customer.segment} />
          <SpecRow label="Country" value={customer.country} />
          <SpecRow label="Billing email" value={customer.email} />
          <SpecRow label="Account" value={customer.active ? "Active" : "Inactive"} />
          <SpecRow label="Verified" value={yesNo(customer.isVerified)} />
          <SpecRow label="VIP" value={yesNo(customer.isVip)} />
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
          { label: "Status", value: order.status, hint: STATUS_HINT[order.status] },
          { label: "Payment", value: paymentStat(order), hint: `Due ${formatDate(order.dueDate)}` },
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
