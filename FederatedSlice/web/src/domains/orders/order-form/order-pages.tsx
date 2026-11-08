import type { ReactNode } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { orderQueryOptions } from "../use-orders";

import { OrderForm } from "./order-form";

function FormPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

export function NewOrder({ onDone }: { onDone: () => void }) {
  return (
    <FormPage title="New order">
      <OrderForm onDone={onDone} />
    </FormPage>
  );
}

/** The route's loader awaited the order (`orderRouteLoader`), so the query is already in the cache. */
export function EditOrder({ orderNo, onDone }: { orderNo: string; onDone: () => void }) {
  const { data: order } = useSuspenseQuery(orderQueryOptions(orderNo));
  return (
    <FormPage title={`Edit ${orderNo}`}>
      <OrderForm key={orderNo} order={order} onDone={onDone} />
    </FormPage>
  );
}
