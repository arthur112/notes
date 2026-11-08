import { getRouteApi, Link } from "@tanstack/react-router";

import {
  customerColumn,
  orderColumnHelper,
  orderLinkClass,
  orderNoColumn,
  totalColumn,
} from "@/domains/orders/columns";
import { OrdersList } from "@/domains/orders/orders-list";
import { EditOrder } from "@/domains/orders/order-form/order-pages";

/**
 * App 2's orders differ where it needs them to: its own, leaner column set
 * (and no "New order"). The filter, list, table and form are still the
 * domain's; replacing one of those is the same move (import yours instead).
 */
const columns = orderColumnHelper.columns([
  orderNoColumn((orderNo) => (
    <Link to="/app2/orders/$orderNo" params={{ orderNo }} className={orderLinkClass}>
      {orderNo}
    </Link>
  )),
  customerColumn,
  totalColumn,
]);

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

const orderRoute = getRouteApi("/app2/orders/$orderNo");

export function OrderPage() {
  const { orderNo } = orderRoute.useParams();
  const navigate = orderRoute.useNavigate();
  return <EditOrder orderNo={orderNo} onDone={() => void navigate({ to: ".." })} />;
}
