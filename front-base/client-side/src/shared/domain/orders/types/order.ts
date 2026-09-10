import { z } from "zod";

/**
 * Canonical order domain — the single source of truth for the shapes both
 * apps (and the mock backend) agree on. Living under `shared/domain/orders`
 * means the two apps query the *same* endpoint contract without duplicating
 * schemas, query keys or hooks.
 */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CHANNELS = ["web", "retail", "partner", "marketplace", "phone"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CURRENCY = "EUR";

/** Display metadata for statuses (labels + Badge tone classes + dot colour). */
export const STATUS_META: Record<
  OrderStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  pending: {
    label: "Pending",
    badgeClass: "border-transparent bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground/60",
  },
  confirmed: {
    label: "Confirmed",
    badgeClass:
      "border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-600/15 dark:ring-sky-300/20",
    dotClass: "bg-sky-500",
  },
  shipped: {
    label: "Shipped",
    badgeClass:
      "border-transparent bg-violet-500/10 text-violet-700 dark:text-violet-300 ring-1 ring-violet-600/15 dark:ring-violet-300/20",
    dotClass: "bg-violet-500",
  },
  delivered: {
    label: "Delivered",
    badgeClass:
      "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600/15 dark:ring-emerald-300/20",
    dotClass: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    badgeClass: "border-transparent bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  web: "Web store",
  retail: "Retail",
  partner: "Partner",
  marketplace: "Marketplace",
  phone: "Phone",
};

export const orderItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1),
  unitPrice: z.coerce.number().nonnegative(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

/** The read model returned by the order API (createdAt/dueDate as ISO strings). */
export const orderSchema = z.object({
  id: z.number(),
  orderNo: z.string(),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    country: z.string(),
  }),
  channel: z.enum(CHANNELS),
  status: z.enum(ORDER_STATUSES),
  items: z.array(orderItemSchema),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
  currency: z.literal(CURRENCY),
  createdAt: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  note: z.string().nullable().optional(),
});
export type Order = z.infer<typeof orderSchema>;

/** Payload to create an order. Totals are computed server-side. */
export const createOrderSchema = z.object({
  customerId: z.string().min(1, "Pick a customer"),
  channel: z.enum(CHANNELS, { error: "Choose a channel" }),
  dueDate: z.string().min(1, "Pick a due date"),
  items: z.array(orderItemSchema).min(1, "Add at least one line item"),
  note: z.string().max(500, "Note is too long").optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
