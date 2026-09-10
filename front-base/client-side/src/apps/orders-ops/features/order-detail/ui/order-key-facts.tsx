import { OrderStatusBadge } from "@/shared/domain/orders/components/order-cells";
import type { Order } from "@/shared/domain/orders";
import { DetailField } from "@/shared/components/detail-field";
import { Card, CardContent } from "@/shared/components/ui/card";
import { formatCurrency, formatDate } from "@/shared/lib/format";

/**
 * The record's key-facts strip (UxGuide §2): the 80%-of-lookups fields that
 * must survive whichever tab is open. Rendered above the tabs, outside them.
 */
export function OrderKeyFacts({ order }: { order: Order }) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className="py-5">
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5">
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-medium tabular-nums">{order.orderNo}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        <DetailField label="Customer" value={order.customer.name} />
        <DetailField label="Total" value={formatCurrency(order.total)} />
        <DetailField label="Due" value={formatDate(order.dueDate)} />
        <DetailField label="Items" value={`${order.items.length} · ${units} units`} />
      </CardContent>
    </Card>
  );
}
