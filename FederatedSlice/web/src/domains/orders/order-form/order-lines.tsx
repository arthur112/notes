import { Plus, Trash2 } from "lucide-react";

import { firstError } from "@/shared/components/form/fields";
import { withForm } from "@/shared/components/form/use-app-form";
import { Button } from "@/shared/components/ui/button";

import { blankLine, linesTotal, orderFormOptions } from "./order-form-options";

/**
 * The line items, split out of the form with `withForm`: it receives the
 * parent's `form`, typed by the same `orderFormOptions`. `lines` is an array
 * field; each cell is its own field at `lines[i].…`.
 */
export const OrderLines = withForm({
  ...orderFormOptions,
  render: function OrderLinesRender({ form }) {
    return (
      <form.AppField name="lines" mode="array">
        {(lines) => (
          <section
            aria-labelledby="order-lines"
            className="space-y-3 rounded-lg border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="order-lines" className="text-sm font-medium">
                Lines
              </h2>
              <Button type="button" variant="outline" onClick={() => lines.pushValue(blankLine())}>
                <Plus />
                Add line
              </Button>
            </div>

            {lines.state.value.map((_, i) => (
              // Index keys are what TanStack Form's array fields expect: field names are index-based too.
              <div key={i} className="flex items-start gap-3">
                <form.AppField name={`lines[${i}].product`}>
                  {(field) => <field.TextField label="Product" className="flex-1" />}
                </form.AppField>
                <form.AppField name={`lines[${i}].quantity`}>
                  {(field) => <field.NumberField label="Qty" className="w-20" />}
                </form.AppField>
                <form.AppField name={`lines[${i}].unitPrice`}>
                  {(field) => <field.NumberField label="Unit price (€)" className="w-32" />}
                </form.AppField>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove line ${i + 1}`}
                  onClick={() => lines.removeValue(i)}
                  className="mt-6"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}

            {firstError(lines.state.meta.errors) && (
              <p role="alert" className="text-xs text-destructive">
                {firstError(lines.state.meta.errors)}
              </p>
            )}

            {/* Subscribes to the lines only, so typing re-renders the total, not the form. */}
            <form.Subscribe selector={(state) => linesTotal(state.values.lines)}>
              {(total) => (
                <p className="text-right text-sm">
                  Total <span className="font-medium tabular-nums">{total.toFixed(2)} €</span>
                </p>
              )}
            </form.Subscribe>
          </section>
        )}
      </form.AppField>
    );
  },
});
