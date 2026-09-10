import { ConditionalOperator, GridifyQueryBuilder } from "gridify-client";

import type { OrderStatus } from "../types/order";

/**
 * Opinionated helpers that sit between the apps and gridify-client:
 * apps describe their filters as plain conditions (field + semantic op),
 * this module builds the canonical Gridify query string the way a client of
 * a real Gridify API would. Keeping gridify-client out of app code means a
 * future switch of query language touches only this file.
 */

export type GridifyPageQuery = {
  page: number;
  pageSize: number;
  orderBy: string;
  filter: string;
};

export interface PagedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderTotals {
  count: number;
  subtotal: number;
  tax: number;
  total: number;
  /** Total item quantity across the filtered orders. */
  units: number;
  /** Distinct customers that placed an order in the filtered window. */
  customers: number;
  /** Order count per status, for fulfilment/pipeline breakdowns. */
  byStatus: Record<OrderStatus, number>;
}

export type MatchOp =
  | "eq"
  | "neq"
  | "lt"
  | "lte"
  | "gt"
  | "gte"
  | "contains"
  | "startsWith"
  | "endsWith";

const GRIDIFY_OPS: Record<MatchOp, ConditionalOperator> = {
  eq: ConditionalOperator.Equal,
  neq: ConditionalOperator.NotEqual,
  lt: ConditionalOperator.LessThan,
  lte: ConditionalOperator.LessThanOrEqual,
  gt: ConditionalOperator.GreaterThan,
  gte: ConditionalOperator.GreaterThanOrEqual,
  contains: ConditionalOperator.Contains,
  startsWith: ConditionalOperator.StartsWith,
  endsWith: ConditionalOperator.EndsWith,
};

/** One filter condition. `field` may be dotted (`customer.name`). */
export interface ConditionSpec {
  field: string;
  op: MatchOp;
  value: string | number | boolean;
  /** Appends the `/i` case-insensitive marker to the emitted condition. */
  caseInsensitive?: boolean;
}

export type BuildPageQueryOptions = {
  page: number;
  pageSize: number;
  orderBy?: string;
  /** Each inner array is OR-joined (wrapped in parentheses); arrays are AND-joined. */
  conditions?: ConditionSpec[][];
};

function addCondition(builder: GridifyQueryBuilder, condition: ConditionSpec): void {
  builder.addCondition(
    condition.field,
    GRIDIFY_OPS[condition.op],
    condition.value,
    condition.caseInsensitive !== true,
  );
}

function addOrGroup(builder: GridifyQueryBuilder, group: ConditionSpec[]): void {
  if (group.length === 1) {
    addCondition(builder, group[0]);
    return;
  }
  builder.startGroup();
  group.forEach((condition, index) => {
    if (index > 0) builder.or();
    addCondition(builder, condition);
  });
  builder.endGroup();
}

/** AND-join `conditions` (each inner array OR-joined) onto an existing builder. */
function applyConditions(builder: GridifyQueryBuilder, conditions?: ConditionSpec[][]): void {
  let hasConditions = false;
  for (const group of conditions ?? []) {
    if (group.length === 0) continue;
    if (hasConditions) builder.and();
    addOrGroup(builder, group);
    hasConditions = true;
  }
}

/**
 * Build just the Gridify `filter` string for a condition set — used by
 * aggregate/KPI queries that only need a filter, not a page.
 */
export function buildFilter(conditions?: ConditionSpec[][]): string {
  const builder = new GridifyQueryBuilder();
  applyConditions(builder, conditions);
  return builder.build().filter ?? "";
}

/** Build the canonical query object (page/pageSize/orderBy/filter strings). */
export function buildPageQuery(options: BuildPageQueryOptions): GridifyPageQuery {
  const builder = new GridifyQueryBuilder();
  applyConditions(builder, options.conditions);

  if (options.orderBy) {
    for (const part of options.orderBy.split(",")) {
      const [field, dir] = part.trim().split(/\s+/, 2);
      if (field) builder.addOrderBy(field, dir === "desc");
    }
  }
  builder.setPage(options.page);
  builder.setPageSize(options.pageSize);

  const query = builder.build();
  return {
    page: options.page,
    pageSize: options.pageSize,
    orderBy: options.orderBy ?? "",
    filter: query.filter ?? "",
  };
}
