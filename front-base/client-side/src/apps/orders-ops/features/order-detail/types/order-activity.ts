import type { Order } from "@/shared/domain/orders";

export type ActivityTone = "neutral" | "info" | "success" | "warning";

export type ActivityEntry = {
  /** ISO timestamp, used for both sorting and display. */
  at: string;
  label: string;
  detail?: string;
  tone: ActivityTone;
};

/**
 * The shape `buildOrderActivity` needs from a shell event. Declaring it here
 * keeps the shell's `ShellEvent` type (and the shell module) out of the UI
 * layer — the page adapts one to the other.
 */
export type ActivityEvent = {
  at: Date;
  source: string;
  message: string;
};

function toneFor(message: string): ActivityTone {
  if (message.toLowerCase().includes("cancelled")) return "warning";
  if (message.toLowerCase().includes("delivered")) return "success";
  return "info";
}

/**
 * The order's audit trail: its own lifecycle timestamps (created, paid) merged
 * with the session's shell events that name this order, newest first. Pure, so
 * the timeline component stays dumb and the page owns nothing but the wiring.
 */
export function buildOrderActivity(order: Order, events: ActivityEvent[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    {
      at: order.createdAt,
      label: "Order created",
      detail: `${order.items.length} line item${order.items.length === 1 ? "" : "s"}`,
      tone: "neutral",
    },
  ];

  if (order.paidAt) {
    entries.push({
      at: order.paidAt,
      label: "Payment received",
      tone: "success",
    });
  }

  for (const event of events) {
    if (event.source !== "orders-ops" || !event.message.includes(order.orderNo)) continue;
    // The order number is redundant on the order's own page; drop it.
    const label = event.message.replaceAll(order.orderNo, "").replace(/\s+/g, " ").trim();
    entries.push({
      at: event.at.toISOString(),
      label: label || event.message,
      tone: toneFor(event.message),
    });
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}
