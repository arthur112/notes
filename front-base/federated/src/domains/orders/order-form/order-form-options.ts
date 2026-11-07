import { formOptions, revalidateLogic } from "@tanstack/react-form";
import { z } from "zod";

import {
  createOrder,
  STATUSES,
  updateOrder,
  type OrderDetail,
  type OrderStatus,
} from "@/api/orders";
import { submitTo } from "@/shared/components/form/submit-to";
import type { ApiResult } from "@/shared/lib/problem";

/** What the controls hold: raw text for numbers (`"10,"` survives), `null` for "not picked". */
export type OrderFormLine = { product: string; quantity: string; unitPrice: string };

export type OrderFormValues = {
  /** The order being edited, `null` when creating: not a control, it picks the endpoint. */
  orderNo: string | null;
  customer: string | null;
  status: OrderStatus;
  dueDate: string | null; // YYYY-MM-DD
  reference: string;
  lines: OrderFormLine[];
};

/** Raw decimal text → number (`" 10,5 "` → 10.5); blank or garbage fails. */
function amount() {
  return z
    .string()
    .trim()
    .min(1, "Required")
    .transform((raw) => Number(raw.replace(",", ".")))
    .pipe(z.number({ error: "Enter a number" }));
}

/**
 * Validates the raw form values **and** turns them into the API payload: its
 * input is `OrderFormValues`, its output is `OrderInput`. TanStack Form runs it
 * as a Standard Schema (no adapter) and routes each issue to the field at its
 * path (`lines.0.quantity` → `lines[0].quantity`).
 */
export const orderFormSchema = z.object({
  orderNo: z.string().nullable(),
  customer: z.string({ error: "Pick a customer" }),
  status: z.enum(STATUSES, { error: "Pick a status" }),
  dueDate: z.string({ error: "Pick a due date" }),
  reference: z
    .string()
    .trim()
    .transform((reference) => reference || undefined),
  lines: z
    .array(
      z.object({
        product: z.string().trim().min(1, "Required"),
        quantity: amount().pipe(z.number().int("Whole units").min(1, "At least 1")),
        unitPrice: amount().pipe(z.number().min(0, "Can't be negative")),
      }),
    )
    .min(1, "Add at least one line"),
});

export const blankLine = (): OrderFormLine => ({ product: "", quantity: "1", unitPrice: "" });

export const emptyOrderForm = (): OrderFormValues => ({
  orderNo: null,
  customer: null,
  status: "pending",
  dueDate: null,
  reference: "",
  lines: [blankLine()],
});

/** A stored order → the raw values its edit form starts from. */
export function toFormValues(order: OrderDetail): OrderFormValues {
  return {
    orderNo: order.orderNo,
    customer: order.customer,
    status: order.status,
    dueDate: order.dueDate,
    reference: order.reference ?? "",
    lines: order.lines.map((line) => ({
      product: line.product,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
    })),
  };
}

/** Live total while typing; a line that doesn't parse yet counts as 0. */
export function linesTotal(lines: OrderFormLine[]): number {
  const num = (raw: string) => Number(raw.replace(",", "."));
  return lines.reduce((sum, l) => sum + (num(l.quantity) * num(l.unitPrice) || 0), 0);
}

/** The schema's output: the API payload plus `orderNo`, which picks the endpoint. */
type OrderFormOutput = z.output<typeof orderFormSchema>;

/** The write: create or update. The form's mutation runs it. */
export function saveOrder({ orderNo, ...input }: OrderFormOutput): Promise<ApiResult<OrderDetail>> {
  return orderNo ? updateOrder(orderNo, input) : createOrder(input);
}

/** The save as the form's last validator (see `submitTo`); `save` is `saveOrder` or the mutation over it. */
export const submitOrder = (save: typeof saveOrder) =>
  submitTo<OrderFormValues, OrderFormOutput>(orderFormSchema, save);

/**
 * Shared by `useAppForm` and `withForm`, which must agree on every validator
 * type, so the sections are typed against the same form. That's why the save
 * validator is declared here, calling the API directly: `OrderForm` swaps in
 * one over its mutation (a hook, so it can't live at module level), same type.
 * `revalidateLogic`: quiet until the first submit, then the schema re-runs on
 * every change, so a fixed field clears its error as you type.
 */
export const orderFormOptions = formOptions({
  defaultValues: emptyOrderForm(),
  validationLogic: revalidateLogic(),
  validators: { onDynamic: orderFormSchema, onSubmitAsync: submitOrder(saveOrder) },
});
