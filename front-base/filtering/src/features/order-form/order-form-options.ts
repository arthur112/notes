import { formOptions, revalidateLogic } from "@tanstack/react-form";
import { z } from "zod";

import {
  createOrder,
  OrderValidationError,
  updateOrder,
  type OrderDetail,
} from "@/features/orders-filters/api/orders-api";
import { STATUSES, type OrderStatus } from "@/features/orders-filters/filter";

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

/**
 * The save, as the form's last validator. It runs only once the schema passes,
 * and a 422 comes back as errors on the fields the server named (each clears
 * when its field changes) plus a form-level message. `value` is the schema's
 * *input* (raw strings), so it is parsed again for the typed payload.
 */
async function saveOrder({ value }: { value: OrderFormValues }) {
  const { orderNo, ...input } = orderFormSchema.parse(value);
  try {
    await (orderNo ? updateOrder(orderNo, input) : createOrder(input));
  } catch (error) {
    if (error instanceof OrderValidationError) return { form: error.message, fields: error.fields };
    return error instanceof Error ? error.message : "Could not save the order.";
  }
}

/**
 * Shared by `useAppForm` and `withForm`, which must agree on every validator
 * type, so the sections are typed against the same form. `revalidateLogic`:
 * quiet until the first submit, then the schema re-runs on every change, so a
 * fixed field clears its error as you type.
 */
export const orderFormOptions = formOptions({
  defaultValues: emptyOrderForm(),
  validationLogic: revalidateLogic(),
  validators: { onDynamic: orderFormSchema, onSubmitAsync: saveOrder },
});
