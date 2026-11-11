import { getRouteApi, Link } from "@tanstack/react-router";

import { ORDER_WRITE } from "@/domains/orders/access";
import { orderColumns, orderLinkClass } from "@/domains/orders/columns";
import { OrdersList } from "@/domains/orders/orders-list";
import { EditOrder, NewOrder } from "@/domains/orders/order-form/order-pages";
import { OrderOverview } from "@/domains/orders/order-overview/order-overview";
import { buttonVariants } from "@/shared/components/ui/button";
import { useShell } from "@/shell/shell-provider";

/** An order number leading to its record page: the list's column and the related orders. */
const orderLink = (orderNo: string) => (
  <Link to="/app1/orders/$orderNo" params={{ orderNo }} className={orderLinkClass}>
    {orderNo}
  </Link>
);

/**
 * App 1's orders: everything from the domain defaults. The app only supplies
 * what depends on its routes (where an order number and "New order" lead,
 * where "done" goes).
 */
const columns = orderColumns(orderLink);

const listRoute = getRouteApi("/app1/orders/");

export function OrdersPage() {
  const navigate = listRoute.useNavigate();
  // Shown only to users who may save it; the API enforces the same rule.
  const canCreate = useShell().can(ORDER_WRITE);
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
        canCreate && (
          <Link to="/app1/orders/new" className={buttonVariants({ size: "lg" })}>
            New order
          </Link>
        )
      }
    />
  );
}

const newRoute = getRouteApi("/app1/orders/new");

export function NewOrderPage() {
  const navigate = newRoute.useNavigate();
  return <NewOrder onDone={() => void navigate({ to: ".." })} />;
}

const orderRoute = getRouteApi("/app1/orders/$orderNo/");

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
            to="/app1/orders/$orderNo/edit"
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

const editRoute = getRouteApi("/app1/orders/$orderNo/edit");

export function EditOrderPage() {
  const { orderNo } = editRoute.useParams();
  const navigate = editRoute.useNavigate();
  return (
    <EditOrder
      orderNo={orderNo}
      onDone={() => void navigate({ to: "/app1/orders/$orderNo", params: { orderNo } })}
    />
  );
}
