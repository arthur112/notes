import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";

import { customerOptionsQueryOptions } from "@/features/customers-filters/api/use-customers";
import { isReferenceTaken, type OrderDetail } from "@/features/orders-filters/api/orders-api";
import { STATUSES, statusLabel } from "@/features/orders-filters/filter";
import { useAppForm } from "@/shared/components/form/use-app-form";
import { buttonVariants } from "@/shared/components/ui/button";

import { emptyOrderForm, orderFormOptions, toFormValues } from "./order-form-options";
import { OrderLines } from "./order-lines";

/**
 * Create (no `order`) or edit an order. The form owns its values: `order` only
 * seeds `defaultValues`, once, so the edit route keys it by order number.
 */
export function OrderForm({ order }: { order?: OrderDetail }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // orders reference customers by name
  const { data: customers = [] } = useQuery({
    ...customerOptionsQueryOptions(),
    select: (refs) => refs.map((customer) => customer.name),
  });

  const form = useAppForm({
    ...orderFormOptions,
    defaultValues: order ? toFormValues(order) : emptyOrderForm(),
    // Only reached once every validator passed, the save (`onSubmitAsync`) included.
    onSubmit: async ({ value, formApi }) => {
      // The list and the order's detail are stale now; the page we return to refetches.
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["order"] });
      // Saved values become the new defaults, so the blocker below lets us leave.
      formApi.reset(value);
      await navigate({ to: "/orders" });
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
              if (reference && (await isReferenceTaken(reference, order?.orderNo))) {
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
        <Link to="/orders" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
