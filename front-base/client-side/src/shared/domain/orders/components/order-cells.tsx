import { formatCurrency, formatDate } from "@/shared/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import { STATUS_META, type OrderStatus } from "../types/order";

/** Presentational order-domain cells shared by both order apps. */

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge className={meta.badgeClass}>
      <span className={cn("size-1.5 shrink-0 rounded-full", meta.dotClass)} aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function CustomerCell({ name, country }: { name: string; country: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">{name}</span>
      <span className="text-xs text-muted-foreground" data-secondary>
        {country}
      </span>
    </div>
  );
}

export function CurrencyCell({ value, className }: { value: number; className?: string }) {
  return <span className={`tabular-nums ${className ?? ""}`}>{formatCurrency(value)}</span>;
}

export function DateCell({ iso }: { iso: string }) {
  return <span className="text-muted-foreground tabular-nums">{formatDate(iso)}</span>;
}

export function ItemsCountCell({ count, className }: { count: number; className?: string }) {
  return (
    <span className={`text-muted-foreground tabular-nums ${className ?? ""}`}>
      {count} {count === 1 ? "item" : "items"}
    </span>
  );
}
