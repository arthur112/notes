import type { ConditionSpec, OrderStatus } from "@/shared/domain/orders";
import { monthStartYmd, nextMonthStartYmd, type Month } from "@/shared/lib/date";

/**
 * The Finance app's filter set — deliberately tiny compared to Ops: a month
 * and a single status. Same shared domain, different specific UX.
 */

export type FinanceStatus = OrderStatus | "all";

export type FinanceFilters = {
  month: Month | null;
  status: FinanceStatus;
};

export const DEFAULT_FINANCE_FILTERS: FinanceFilters = {
  month: null,
  status: "all",
};

export function isFinanceDefault(filters: FinanceFilters): boolean {
  return filters.month === null && filters.status === "all";
}

export function toFinanceConditions(filters: FinanceFilters): ConditionSpec[][] {
  const groups: ConditionSpec[][] = [];

  if (filters.month) {
    // Two separate groups → AND-joined; putting both bounds in one group would
    // OR-join them into a no-op `(createdAt>=start|createdAt<end)`.
    groups.push([{ field: "createdAt", op: "gte", value: monthStartYmd(filters.month) }]);
    groups.push([{ field: "createdAt", op: "lt", value: nextMonthStartYmd(filters.month) }]);
  }
  if (filters.status !== "all") {
    groups.push([{ field: "status", op: "eq", value: filters.status }]);
  }
  return groups;
}
