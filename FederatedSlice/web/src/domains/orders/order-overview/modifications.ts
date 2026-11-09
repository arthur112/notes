import type { OrderOverview } from "@/api/orders";
import { addDays, parseISO, toIsoDay } from "@/shared/lib/date";
import { formatAmount, formatDate } from "@/shared/lib/format";

export type Modification = {
  date: string; // YYYY-MM-DD
  kind: string;
  description: string;
  agent: string;
};

/**
 * MOCK: orders keep no history, so the log is made up from the order itself:
 * the same order always gets the same entries, dated from its order date
 * (never after the server's today). Most recent first.
 */
export function mockModifications(order: OrderOverview): Modification[] {
  const day = (offset: number) => {
    const date = toIsoDay(addDays(parseISO(order.createdAt), offset));
    return date < order.asOf ? date : order.asOf;
  };
  const [first] = order.lines;

  // In date order; `false` drops an entry that doesn't apply.
  const entries: (Modification | false)[] = [
    {
      date: day(0),
      kind: "Created",
      description: `${order.lines.length} lines · ${formatAmount(order.total)}`,
      agent: "editor",
    },
    order.reference !== null && {
      date: day(0),
      kind: "Reference set",
      description: order.reference,
      agent: "editor",
    },
    first !== undefined && {
      date: day(1),
      kind: "Line changed",
      description: `${first.product} quantity set to ${first.quantity}`,
      agent: "M. Laurent",
    },
    {
      date: day(1),
      kind: "Due date set",
      description: formatDate(order.dueDate),
      agent: "OrderRules",
    },
    {
      date: day(2),
      kind: "Credit check",
      description: order.customer.isOnHold ? "Customer on credit hold" : "Passed",
      agent: "system",
    },
    order.status !== "Pending" && {
      date: day(3),
      kind: "Status changed",
      description: `Pending → ${order.status}`,
      agent: "A. Novak",
    },
    {
      date: order.asOf,
      kind: "Risk reviewed",
      description: `Graded ${order.risk.grade} · ${order.risk.band}`,
      agent: "system",
    },
  ];
  return entries.filter((entry): entry is Modification => entry !== false).reverse();
}
