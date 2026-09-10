import type { Order, OrderItem } from "@/shared/domain/orders";
import { formatCurrency } from "@/shared/lib/format";

/** Small dumb table of order line items (used by detail + create preview). */
export function OrderItemsTable({ items }: { items: OrderItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Item</th>
            <th className="px-3 py-2 text-right font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Unit</th>
            <th className="px-3 py-2 text-right font-medium">Line</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const line = item.quantity * item.unitPrice;
            return (
              <tr key={index} className="border-b last:border-0">
                <td className="px-3 py-2">{item.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {formatCurrency(line)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OrderTotalsRow({ order }: { order: Pick<Order, "subtotal" | "tax" | "total"> }) {
  return (
    <div className="flex justify-end">
      <dl className="w-full max-w-60 space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax (21%)</dt>
          <dd className="tabular-nums">{formatCurrency(order.tax)}</dd>
        </div>
        <div className="flex justify-between border-t pt-1 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCurrency(order.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
