import { ConditionalOperator, GridifyQueryBuilder } from "gridify-client";

/**
 * The only file that knows about gridify-client: features describe their
 * filters as plain conditions (field + semantic op), this module turns them
 * into the canonical Gridify `filter` string.
 */

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
}

function addCondition(builder: GridifyQueryBuilder, condition: ConditionSpec): void {
  builder.addCondition(condition.field, GRIDIFY_OPS[condition.op], condition.value);
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

/**
 * Build the Gridify `filter` string. Each inner array is OR-joined (wrapped in
 * parentheses); the arrays themselves are AND-joined.
 */
export function buildFilter(conditions: ConditionSpec[][]): string {
  const builder = new GridifyQueryBuilder();
  let hasConditions = false;
  for (const group of conditions) {
    if (group.length === 0) continue;
    if (hasConditions) builder.and();
    addOrGroup(builder, group);
    hasConditions = true;
  }
  return builder.build().filter ?? "";
}
