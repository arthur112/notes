import type { Channel, CreateOrderInput, OrderItem } from "@/shared/domain/orders";
import { addDaysYmd, todayYmd } from "@/shared/lib/date";
import { round2 } from "@/shared/lib/format";

/**
 * Pure helpers/constants for the create-order form: defaults, blank line
 * items, per-line validity and money math (mirrors what the server does).
 */

export type OrderCreateFormValues = {
  customerId: string;
  channel: Channel;
  dueDate: string;
  note: string;
};

export function defaultCreateValues(): OrderCreateFormValues {
  return {
    customerId: "",
    channel: "web",
    dueDate: addDaysYmd(todayYmd(), 21),
    note: "",
  };
}

export function blankLine(): OrderItem {
  return { name: "", quantity: 1, unitPrice: 0 };
}

export function isLineValid(line: OrderItem): boolean {
  return line.name.trim().length > 0 && line.quantity > 0 && line.unitPrice >= 0;
}

export function lineTotal(line: OrderItem): number {
  return round2(line.quantity * line.unitPrice);
}

export function itemsTotals(items: OrderItem[]): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = round2(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const tax = round2(subtotal * 0.21);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

export type { CreateOrderInput };
