import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { SearchSelect, type MultiSelectOption } from "@/shared/components/ui/search-select";
import { DatePicker } from "@/shared/components/ui/date-picker";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  CHANNELS,
  CHANNEL_LABELS,
  createOrderSchema,
  useCreateOrderMutation,
  type Channel,
  type CreateOrderInput,
  type OrderItem,
} from "@/shared/domain/orders";
import { formatCurrency } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";
import { useShell } from "@/shell/ShellProvider";

import { useCustomers } from "../api/customers";
import {
  blankLine,
  defaultCreateValues,
  isLineValid,
  itemsTotals,
  lineTotal,
} from "../types/order-create-form";

function FieldMessage({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null;
}

function firstError(error: unknown): string | undefined {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) return firstError(error[0]);
  return undefined;
}

/** Order creation — the Ops feature's own UX over the shared create contract. */
export function OrderCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { publish } = useShell();
  const { customers, isPending: customersLoading } = useCustomers();
  const createOrder = useCreateOrderMutation();

  const [channel, setChannel] = useState<Channel>("web");
  const [lines, setLines] = useState<OrderItem[]>([blankLine()]);

  const form = useForm({
    defaultValues: defaultCreateValues(),
    onSubmit: async ({ value }) => {
      const payload: CreateOrderInput = {
        customerId: value.customerId,
        channel,
        dueDate: value.dueDate,
        items: lines.map((line) => ({
          name: line.name.trim(),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        note: value.note.trim() || undefined,
      };
      const parsed = createOrderSchema.safeParse(payload);
      if (!parsed.success) return;
      try {
        const order = await createOrder.mutateAsync(parsed.data);
        publish("orders-ops", `Created ${order.orderNo} · ${formatCurrency(order.total)}`);
        onOpenChange(false);
      } catch {
        // toast handled by the mutation hook
      }
    },
  });

  // Fresh form every time the sheet opens.
  useEffect(() => {
    if (open) {
      form.reset();
      setChannel("web");
      setLines([blankLine()]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const customerOptions: MultiSelectOption[] = customers.map((c) => ({
    value: c.id,
    label: `${c.name} · ${c.country}`,
  }));

  const updateLine = (index: number, patch: Partial<OrderItem>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, i) => i !== index));
  };

  const addLine = () => setLines((current) => [...current, blankLine()]);
  const canAddLine = lines.every(isLineValid);
  const totals = itemsTotals(lines);
  const busy = createOrder.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex max-h-svh w-full flex-col gap-0 p-0 sm:max-w-lg">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <SheetHeader className="border-b p-4 pr-10">
            <SheetTitle>New order</SheetTitle>
            <SheetDescription>
              The order is created server-side: the mock API computes totals and assigns the number.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <div className="space-y-4">
              <form.Field
                name="customerId"
                validators={{ onChange: createOrderSchema.shape.customerId }}
              >
                {(field) => (
                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Customer *
                    </span>
                    <SearchSelect
                      options={customerOptions}
                      value={field.state.value || null}
                      onChange={(next) => field.handleChange(next ?? "")}
                      placeholder={customersLoading ? "Loading customers…" : "Pick a customer…"}
                      className="h-9 w-full"
                    />
                    <FieldMessage error={firstError(field.state.meta.errors)} />
                  </div>
                )}
              </form.Field>

              <div>
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Channel *
                </span>
                <div role="radiogroup" aria-label="Channel" className="flex flex-wrap gap-1.5">
                  {CHANNELS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={channel === option}
                      onClick={() => setChannel(option)}
                      className={cn(
                        "rounded-md border px-2.5 py-1.5 text-sm transition-colors",
                        channel === option
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-accent",
                      )}
                    >
                      {CHANNEL_LABELS[option]}
                    </button>
                  ))}
                </div>
              </div>

              <form.Field name="dueDate" validators={{ onChange: createOrderSchema.shape.dueDate }}>
                {(field) => (
                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Due date *
                    </span>
                    <DatePicker
                      value={field.state.value || null}
                      onChange={(next) => field.handleChange(next ?? "")}
                      placeholder="Pick a due date"
                      className="h-9 w-full"
                    />
                    <FieldMessage error={firstError(field.state.meta.errors)} />
                  </div>
                )}
              </form.Field>

              <form.Field name="note">
                {(field) => (
                  <div>
                    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                      Note
                    </span>
                    <Textarea
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Optional internal note…"
                      rows={2}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-xs font-medium text-muted-foreground">Line items *</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addLine}
                  disabled={!canAddLine}
                >
                  <Plus />
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line, index) => {
                  const valid = isLineValid(line);
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex flex-1 flex-col gap-1">
                        <Input
                          value={line.name}
                          onChange={(e) => updateLine(index, { name: e.target.value })}
                          placeholder="Product name"
                          aria-label={`Line ${index + 1} product`}
                          aria-invalid={line.name.trim().length === 0}
                          className="h-9"
                        />
                      </div>
                      <Input
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                        type="number"
                        min={1}
                        aria-label={`Line ${index + 1} quantity`}
                        className="h-9 w-16 tabular-nums"
                      />
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
                          €
                        </span>
                        <Input
                          value={line.unitPrice}
                          onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                          type="number"
                          min={0}
                          step={0.01}
                          aria-label={`Line ${index + 1} unit price`}
                          className="h-9 pl-6 text-right tabular-nums"
                        />
                      </div>
                      <div className="flex h-9 w-24 items-center justify-end text-sm tabular-nums">
                        {formatCurrency(lineTotal(line))}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length === 1}
                        aria-label={`Remove line ${index + 1}`}
                      >
                        <Trash2 />
                      </Button>
                      {!valid && (
                        <p className="col-span-4 text-xs text-destructive">
                          Fill in the product name.
                        </p>
                      )}
                    </div>
                  );
                })}
                {lines.length === 0 && (
                  <p className="text-xs text-destructive">Add at least one line item.</p>
                )}
              </div>
            </div>

            <dl className="ml-auto w-56 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax (21%)</dt>
                <dd className="tabular-nums">{formatCurrency(totals.tax)}</dd>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCurrency(totals.total)}</dd>
              </div>
            </dl>
          </div>

          <SheetFooter className="border-t p-4">
            <Button type="submit" disabled={busy || lines.length === 0}>
              {busy ? "Creating…" : "Create order"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
