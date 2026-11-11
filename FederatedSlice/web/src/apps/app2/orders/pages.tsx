import { getRouteApi, Link } from "@tanstack/react-router";

import {
  customerColumn,
  orderColumnHelper,
  orderLinkClass,
  orderNoColumn,
  totalColumn,
} from "@/domains/orders/columns";
import { OrdersList } from "@/domains/orders/orders-list";
import { ORDER_WRITE } from "@/domains/orders/access";
import { EditOrder } from "@/domains/orders/order-form/order-pages";
import { OrderOverview } from "@/domains/orders/order-overview/order-overview";
import { buttonVariants } from "@/shared/components/ui/button";
import { useShell } from "@/shell/shell-provider";

/** An order number leading to its record page: the list's column and the related orders. */
const orderLink = (orderNo: string) => (
  <Link to="/app2/orders/$orderNo" params={{ orderNo }} className={orderLinkClass}>
    {orderNo}
  </Link>
);

/**
 * App 2's orders differ where it needs them to: its own, leaner column set
 * (and no "New order"). The filter, list, table and form are still the
 * domain's; replacing one of those is the same move (import yours instead).
 */
const columns = orderColumnHelper.columns([orderNoColumn(orderLink), customerColumn, totalColumn]);

const listRoute = getRouteApi("/app2/orders/");

export function OrdersPage() {
  const navigate = listRoute.useNavigate();
  return (
    <OrdersList
      search={listRoute.useSearch()}
      onPatch={(changes) =>
        void navigate({ search: (prev) => ({ ...prev, page: undefined, ...changes }) })
      }
      columns={columns}
    />
  );
}

const orderRoute = getRouteApi("/app2/orders/$orderNo/");

export function OrderPage() {
  const { orderNo } = orderRoute.useParams();
  const canEdit = useShell().can(ORDER_WRITE);
  return (
    <OrderOverview
      orderNo={orderNo}
      orderLink={orderLink}
      action={
        canEdit && (
          <Link
            to="/app2/orders/$orderNo/edit"
            params={{ orderNo }}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Edit
          </Link>
        )
      }
    />
  );
}

const editRoute = getRouteApi("/app2/orders/$orderNo/edit");

export function EditOrderPage() {
  const { orderNo } = editRoute.useParams();
  const navigate = editRoute.useNavigate();
  return (
    <EditOrder
      orderNo={orderNo}
      onDone={() => void navigate({ to: "/app2/orders/$orderNo", params: { orderNo } })}
    />
  );
}
