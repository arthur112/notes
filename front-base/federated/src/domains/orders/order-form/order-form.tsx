import { useBlocker } from "@tanstack/react-router";

import { STATUSES, type OrderDetail } from "@/api/orders";
import { useAppForm } from "@/shared/components/form/use-app-form";
import { Button } from "@/shared/components/ui/button";

import { statusLabel } from "../filter";

import { emptyOrderForm, orderFormOptions, submitOrder, toFormValues } from "./order-form-options";
import { OrderLines } from "./order-lines";
import { useOrderFormData } from "./use-order-form-data";

/**
 * Create (no `order`) or edit an order. The form owns its values: `order` only
 * seeds `defaultValues`, once, so the edit route keys it by order number.
 * `onDone` (after a save, or Cancel) is the app's: only it knows its routes.
 * Server reads and writes come from `useOrderFormData`; the form only renders
 * and validates.
 */
export function OrderForm({ order, onDone }: { order?: OrderDetail; onDone: () => void }) {
  const { customers, save, isReferenceTaken } = useOrderFormData(order);

  const form = useAppForm({
    ...orderFormOptions,
    defaultValues: order ? toFormValues(order) : emptyOrderForm(),
    // The save goes through the mutation; its problems still land on the form's fields.
    validators: {
      ...orderFormOptions.validators,
      onSubmitAsync: submitOrder(save),
    },
    // Only reached once every validator passed, the save (`onSubmitAsync`) included.
    onSubmit: async ({ value, formApi }) => {
      // Saved values become the new defaults, so the blocker below lets us leave.
      formApi.reset(value);
      onDone();
    },
  });

  // Read at navigation time, not subscribed: no re-render per keystroke.
  useBlocker({
    shouldBlockFn: () => !form.state.isDefaultValue && !window.confirm("Discard unsaved changes?"),
    enableBeforeUnload: () => !form.state.isDefaultValue,
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
        <form.AppField name="customer">
          {(field) => (
            <field.SelectField label="Customer" options={customers} placeholder="Pick a customer" />
          )}
        </form.AppField>
        <form.AppField name="status">
          {(field) => (
            <field.SelectField label="Status" options={STATUSES} itemToStringLabel={statusLabel} />
          )}
        </form.AppField>
        <form.AppField name="dueDate">
          {(field) => <field.DateField label="Due date" />}
        </form.AppField>
        <form.AppField
          name="reference"
          validators={{
            // Field-level and async: asks the server once typing pauses.
            onChangeAsyncDebounceMs: 400,
            onChangeAsync: async ({ value }) => {
              const reference = value.trim();
              if (reference && (await isReferenceTaken(reference))) {
                return "Already used on another order";
              }
            },
          }}
        >
          {(field) => <field.TextField label="Customer PO (optional)" placeholder="e.g. PO-2042" />}
        </form.AppField>
      </div>

      <OrderLines form={form} />

      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) =>
          typeof error === "string" && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )
        }
      </form.Subscribe>

      <div className="flex gap-2">
        <form.AppForm>
          <form.SubmitButton>{order ? "Save changes" : "Create order"}</form.SubmitButton>
        </form.AppForm>
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
