import type { ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";

import { orderQueryOptions } from "@/features/orders-filters/api/use-orders";

import { OrderForm } from "./order-form";

function FormPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export function NewOrderPage() {
  return (
    <FormPage title="New order">
      <OrderForm />
    </FormPage>
  );
}

const editRoute = getRouteApi("/orders/$orderNo/edit");

/** The loader awaited the order, so the query is already in the cache. */
export function EditOrderPage() {
  const { orderNo } = editRoute.useParams();
  const { data: order } = useSuspenseQuery(orderQueryOptions(orderNo));
  return (
    <FormPage title={`Edit ${orderNo}`}>
      <OrderForm key={orderNo} order={order} />
    </FormPage>
  );
}
