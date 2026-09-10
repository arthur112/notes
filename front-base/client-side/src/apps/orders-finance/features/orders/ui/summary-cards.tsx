import { BadgeEuro, CircleDollarSign, ReceiptText, Wallet } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCurrency } from "@/shared/lib/format";
import type { OrderTotals } from "@/shared/domain/orders";

const CARDS = [
  { key: "count", label: "Orders", icon: ReceiptText },
  { key: "subtotal", label: "Net sales", icon: CircleDollarSign },
  { key: "tax", label: "VAT", icon: BadgeEuro },
  { key: "total", label: "Total billed", icon: Wallet },
] as const;

export type FinanceSummaryCardsProps = {
  totals: OrderTotals | undefined;
  isPending: boolean;
  periodLabel: string;
};

/** Read-only aggregate cards for the Finance app. */
export function FinanceSummaryCards({ totals, isPending, periodLabel }: FinanceSummaryCardsProps) {
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground uppercase">Scope {periodLabel}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => {
          const value = totals?.[card.key];
          return (
            <Card key={card.key}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <card.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{card.label}</p>
                  {isPending || value === undefined ? (
                    <Skeleton className="mt-1 h-5 w-20" />
                  ) : (
                    <p className="font-semibold tabular-nums">
                      {card.key === "count" ? String(value) : formatCurrency(Number(value))}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
