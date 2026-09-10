import { OrderStatusBadge } from "@/shared/domain/orders/components/order-cells";
import { CHANNEL_LABELS, type Order } from "@/shared/domain/orders";
import { DetailField } from "@/shared/components/detail-field";
import { DetailGrid } from "@/shared/components/detail-grid";
import { DetailSection } from "@/shared/components/detail-section";
import { formatDate, formatDateTime } from "@/shared/lib/format";

/**
 * The `Details` tab: the order's field sections, grouped UxGuide-style (§2) into
 * 3–9-field cards with audit metadata last and muted. Dumb — resolved order in,
 * markup out. The key-facts strip lives outside the tabs (see `OrderKeyFacts`)
 * so it stays visible whichever tab is active.
 */
export function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="space-y-5">
      <DetailSection title="Customer">
        <DetailGrid>
          <DetailField label="Customer" value={order.customer.name} />
          <DetailField
            label="Customer ID"
            value={<span className="font-mono text-xs">{order.customer.id}</span>}
          />
          <DetailField label="Country" value={order.customer.country} />
        </DetailGrid>
      </DetailSection>

      <DetailSection title="Fulfilment">
        <DetailGrid>
          <DetailField label="Status" value={<OrderStatusBadge status={order.status} />} />
          <DetailField label="Channel" value={CHANNEL_LABELS[order.channel]} />
          <DetailField label="Created" value={formatDateTime(order.createdAt)} />
          <DetailField label="Due" value={formatDate(order.dueDate)} />
          <DetailField
            label="Paid"
            value={order.paidAt ? formatDateTime(order.paidAt) : undefined}
          />
        </DetailGrid>
      </DetailSection>

      {/* Metadata: audit data, not working data — last and muted. */}
      <DetailSection title="Metadata" muted>
        <DetailGrid>
          <DetailField label="Internal ID" value={String(order.id)} />
          <DetailField label="Order number" value={order.orderNo} />
          <DetailField label="Created at" value={formatDateTime(order.createdAt)} />
          <DetailField label="Currency" value={order.currency} />
          <DetailField label="Note" value={order.note ?? undefined} />
        </DetailGrid>
      </DetailSection>
    </div>
  );
}
