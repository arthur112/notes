import { getRouteApi, Link } from "@tanstack/react-router";

import { orderColumns, orderLinkClass } from "@/domains/orders/columns";
import { OrdersList } from "@/domains/orders/orders-list";
import { EditOrder, NewOrder } from "@/domains/orders/order-form/order-pages";
import { buttonVariants } from "@/shared/components/ui/button";

/**
 * App 1's orders: everything from the domain defaults. The app only supplies
 * what depends on its routes (where an order number and "New order" lead,
 * where "done" goes).
 */
const columns = orderColumns((orderNo) => (
  <Link to="/app1/orders/$orderNo" params={{ orderNo }} className={orderLinkClass}>
    {orderNo}
  </Link>
));

const listRoute = getRouteApi("/app1/orders/");

export function OrdersPage() {
  const navigate = listRoute.useNavigate();
  return (
    <OrdersList
      search={listRoute.useSearch()}
      // Each patch is a history entry, so Back undoes a filter. It applies to the
      // current search, not this render's, since a debounced patch can land later.
      // A new filter or order starts again at page 1; only a pagination patch,
      // which sets `page` itself, overrides that.
      onPatch={(changes) =>
        void navigate({ search: (prev) => ({ ...prev, page: undefined, ...changes }) })
      }
      columns={columns}
      action={
        <Link to="/app1/orders/new" className={buttonVariants({ size: "lg" })}>
          New order
        </Link>
      }
    />
  );
}

const newRoute = getRouteApi("/app1/orders/new");

export function NewOrderPage() {
  const navigate = newRoute.useNavigate();
  return <NewOrder onDone={() => void navigate({ to: ".." })} />;
}

const orderRoute = getRouteApi("/app1/orders/$orderNo");

export function OrderPage() {
  const { orderNo } = orderRoute.useParams();
  const navigate = orderRoute.useNavigate();
  return <EditOrder orderNo={orderNo} onDone={() => void navigate({ to: ".." })} />;
}
