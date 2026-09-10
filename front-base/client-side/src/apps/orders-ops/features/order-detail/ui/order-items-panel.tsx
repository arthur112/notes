import type { Order } from "@/shared/domain/orders";
import { DetailSection } from "@/shared/components/detail-section";

import { OrderItemsTable, OrderTotalsRow } from "./order-items-table";

/**
 * The `Items` tab: the line-item table gets the full page width, which matters
 * once an order has more than a handful of lines. Dumb.
 */
export function OrderItemsPanel({ order }: { order: Order }) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <DetailSection
      title={`Items · ${order.items.length}`}
      description={`${units} unit${units === 1 ? "" : "s"}`}
    >
      <OrderItemsTable items={order.items} />
      <OrderTotalsRow order={order} />
    </DetailSection>
  );
}
