import { useMemo } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeft, History, Package, ScrollText } from "lucide-react";

import { PageHeader } from "@/shared/components/ui/page-header";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DetailTabs, type DetailTab } from "@/shared/components/detail-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  ORDER_STATUSES,
  STATUS_META,
  useOrder,
  useSetOrderStatusMutation,
  type OrderStatus,
} from "@/shared/domain/orders";
import { useShell } from "@/shell/ShellProvider";

import { DEFAULT_ORDER_DETAIL_TAB, type OrderDetailTab } from "../types/order-detail-tab";
import { buildOrderActivity } from "../types/order-activity";
import { OrderActivity } from "../ui/order-activity";
import { OrderDetail } from "../ui/order-detail";
import { OrderItemsPanel } from "../ui/order-items-panel";
import { OrderKeyFacts } from "../ui/order-key-facts";

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-9 w-72 rounded-lg" />
      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

/**
 * Orders · Ops detail — the row's full record as a deep-linkable page at
 * `/apps/orders-ops/$orderNo`, rather than a drawer over the list.
 *
 * The record's workflows are split into tabs (`Details` / `Items` / `Activity`)
 * because they are mutually exclusive (UxGuide §3); the key-facts strip stays
 * above them so the fields most visits need never disappear. The active tab is
 * mirrored into `?tab=…` (with `replace`) so it is shareable while Back still
 * leaves the page for the list. The shell breadcrumb is the other way back:
 * Apps › Orders · Ops › {orderNo}.
 */
export function OrderDetailPage() {
  const { orderNo } = useParams({ from: "/apps/orders-ops/$orderNo" });
  const { tab } = useSearch({ from: "/apps/orders-ops/$orderNo" });
  const navigate = useNavigate();
  const { events, publish } = useShell();
  const setStatus = useSetOrderStatusMutation();
  const order = useOrder(orderNo);

  const activity = useMemo(
    () => (order.data ? buildOrderActivity(order.data, events) : []),
    [order.data, events],
  );

  const activeTab = tab ?? DEFAULT_ORDER_DETAIL_TAB;

  // `replace` keeps tab switches out of history: Back from any tab returns to
  // the list rather than walking the tabs the user already looked at.
  const setTab = (next: string) => {
    void navigate({
      to: "/apps/orders-ops/$orderNo",
      params: { orderNo },
      search: next === DEFAULT_ORDER_DETAIL_TAB ? {} : { tab: next as OrderDetailTab },
      replace: true,
    });
  };

  if (order.isPending) return <DetailSkeleton />;

  if (order.isError || !order.data) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Order not found"
          description={order.error?.message ?? `No order matches “${orderNo}”.`}
        />
        <Button variant="outline" render={<Link to="/apps/orders-ops" />}>
          <ArrowLeft />
          Back to orders
        </Button>
      </div>
    );
  }

  const data = order.data;
  const transitions = ORDER_STATUSES.filter((status) => status !== data.status);

  const changeStatus = (status: OrderStatus) => {
    setStatus.mutate({ id: data.id, status });
    publish("orders-ops", `Marked ${data.orderNo} as ${STATUS_META[status].label}`);
  };

  const tabs: DetailTab[] = [
    {
      value: "details",
      label: "Details",
      icon: ScrollText,
      content: <OrderDetail order={data} />,
    },
    {
      value: "items",
      label: "Items",
      icon: Package,
      count: data.items.length,
      content: <OrderItemsPanel order={data} />,
    },
    {
      value: "activity",
      label: "Activity",
      icon: History,
      content: <OrderActivity entries={activity} />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={data.orderNo} description={data.customer.name}>
        <Button variant="outline" render={<Link to="/apps/orders-ops" />}>
          <ArrowLeft />
          All orders
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button disabled={setStatus.isPending} />}>
            {setStatus.isPending ? "Updating…" : "Change status"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Move to…</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {transitions.map((status) => (
              <DropdownMenuItem
                key={status}
                variant={status === "cancelled" ? "destructive" : "default"}
                onClick={() => changeStatus(status)}
              >
                {STATUS_META[status].label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <OrderKeyFacts order={data} />

      <DetailTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={setTab}
        aria-label="Order record sections"
      />
    </div>
  );
}
