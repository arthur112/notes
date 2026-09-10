/**
 * A small in-memory evaluation of the Gridify query language — the piece a
 * real backend would do. It parses the exact query strings `gridify-client`
 * produces (see the escaping/`/i` rules mirrored below), so swapping the mock
 * for a real Gridify-enabled API later requires no change in the apps.
 *
 * Supported grammar (subset emitted by GridifyQueryBuilder):
 *   expr   := andExpr ('|' andExpr)*            OR binds looser than AND
 *   andExpr:= atom (',' atom)*
 *   atom   := '(' expr ')' | condition
 *   condition := field op value ['/i']          value chars ( ) , | escaped as \( \) \, \|
 */

export type GridifyOperator =
  | "="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">="
  | "=*"
  | "!*"
  | "^"
  | "!^"
  | "$"
  | "!$";

const OPERATORS: GridifyOperator[] = [
  ">=",
  "<=",
  "!=",
  "=*",
  "!*",
  "!^",
  "!$",
  "=",
  "<",
  ">",
  "^",
  "$",
];

const OP_CHARS = new Set(["=", "<", ">", "!", "^", "$", "*"]);

type Condition = {
  field: string;
  op: GridifyOperator;
  value: string;
  caseInsensitive: boolean;
};

type Node =
  | { kind: "cond"; cond: Condition }
  | { kind: "or"; items: Node[] }
  | { kind: "and"; items: Node[] };

/** Split `orderBy` ("createdAt desc, total asc") into sort specs. */
export type SortSpec = { field: string; descending: boolean };

export function parseOrderBy(orderBy: string | undefined): SortSpec[] {
  if (!orderBy) return [];
  return orderBy
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [field, dir] = part.split(/\s+/, 2);
      return { field, descending: dir === "desc" };
    });
}

/** Parse a filter expression into an AST. */
export function parseFilter(filter: string | undefined): Node | null {
  const src = filter ?? "";
  if (!src.trim()) return null;
  const [node] = parseOr(src, 0);
  return node;
}

// --- recursive descent over the raw string --------------------------------

function parseOr(src: string, i: number): [Node, number] {
  const items: Node[] = [];
  let [node, next] = parseAnd(src, i);
  items.push(node);
  while (next < src.length && src[next] === "|") {
    [node, next] = parseAnd(src, next + 1);
    items.push(node);
  }
  return [items.length === 1 ? items[0] : { kind: "or", items }, next];
}

function parseAnd(src: string, i: number): [Node, number] {
  const items: Node[] = [];
  let [node, next] = parseAtom(src, i);
  items.push(node);
  while (next < src.length && src[next] === ",") {
    [node, next] = parseAtom(src, next + 1);
    items.push(node);
  }
  return [items.length === 1 ? items[0] : { kind: "and", items }, next];
}

function parseAtom(src: string, i: number): [Node, number] {
  if (src[i] === "(") {
    const [node, next] = parseOr(src, i + 1);
    if (src[next] !== ")") throw new Error(`Gridify: unbalanced group at ${next}`);
    return [node, next + 1];
  }
  const [text, next] = readCondition(src, i);
  return [{ kind: "cond", cond: parseCondition(text) }, next];
}

/** Read one condition up to an unescaped separator ( , | ( ) or end). */
function readCondition(src: string, i: number): [string, number] {
  let out = "";
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\") {
      // escape: keep backslash + next char, both belong to the value
      out += ch + (src[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (ch === "," || ch === "|" || ch === "(" || ch === ")") break;
    out += ch;
    i += 1;
  }
  return [out, i];
}

function parseCondition(text: string): Condition {
  // case-insensitive marker appended by gridify-client after escaping
  let raw = text;
  let caseInsensitive = false;
  if (raw.endsWith("/i") && !raw.endsWith("\\/i")) {
    caseInsensitive = true;
    raw = raw.slice(0, -2);
  }
  // unescape reserved characters: \( \) \, \| \/
  raw = raw.replace(/\\([(),|/])/g, "$1");

  const opIndex = findOperator(raw);
  if (opIndex === -1) throw new Error(`Gridify: no operator in condition "${text}"`);
  const op = OPERATORS.find((o) => raw.startsWith(o, opIndex));
  if (!op) throw new Error(`Gridify: unknown operator in "${text}"`);
  const field = raw.slice(0, opIndex).trim();
  const value = raw.slice(opIndex + op.length);
  if (!field || value === undefined) {
    throw new Error(`Gridify: malformed condition "${text}"`);
  }
  return { field, op, value, caseInsensitive };
}

/** Index of the first char that starts one of the operators (fields never contain them). */
function findOperator(raw: string): number {
  for (let i = 0; i < raw.length; i++) {
    if (OP_CHARS.has(raw[i])) return i;
  }
  return -1;
}

// --- evaluation -------------------------------------------------------------

/** Primitive leaf values our filters compare against. */
type FieldValue = number | string | boolean | null | undefined;

/** Read a (possibly dotted) field from a record, coerced to a comparable primitive. */
function resolvePath(record: unknown, path: string): FieldValue {
  let cur: unknown = record;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  switch (typeof cur) {
    case "number":
    case "string":
    case "boolean":
    case "undefined":
      return cur;
    case "object":
      return cur === null ? null : String(cur);
    default:
      return String(cur);
  }
}

function isNumeric(value: FieldValue): value is number {
  return typeof value === "number" || !Number.isNaN(Number(value));
}

function compareValues(a: FieldValue, b: FieldValue): number {
  // string values that look like ISO datetimes compare lexicographically
  const aNum = isNumeric(a);
  const bNum = isNumeric(b);
  if (aNum && bNum) {
    const n = Number(a) - Number(b);
    return n === 0 ? 0 : n > 0 ? 1 : -1;
  }
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function eqValue(actual: FieldValue, expected: string, ci: boolean): boolean {
  if (typeof actual === "boolean") return actual === (expected === "true");
  const a = String(actual);
  const b = expected;
  return ci ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function matchCondition(record: unknown, cond: Condition): boolean {
  const actual = resolvePath(record, cond.field);
  const { op, value, caseInsensitive: ci } = cond;

  switch (op) {
    case "=":
      return eqValue(actual, value, ci);
    case "!=":
      return !eqValue(actual, value, ci);
    case "<":
      return actual !== undefined && compareValues(actual, value) < 0;
    case "<=":
      return actual !== undefined && compareValues(actual, value) <= 0;
    case ">":
      return actual !== undefined && compareValues(actual, value) > 0;
    case ">=":
      return actual !== undefined && compareValues(actual, value) >= 0;
    case "=*": {
      const a = String(actual ?? "");
      return ci ? a.toLowerCase().includes(value.toLowerCase()) : a.includes(value);
    }
    case "!*": {
      const a = String(actual ?? "");
      return ci ? !a.toLowerCase().includes(value.toLowerCase()) : !a.includes(value);
    }
    case "^": {
      const a = String(actual ?? "");
      return ci ? a.toLowerCase().startsWith(value.toLowerCase()) : a.startsWith(value);
    }
    case "!^": {
      const a = String(actual ?? "");
      return ci ? !a.toLowerCase().startsWith(value.toLowerCase()) : !a.startsWith(value);
    }
    case "$": {
      const a = String(actual ?? "");
      return ci ? a.toLowerCase().endsWith(value.toLowerCase()) : a.endsWith(value);
    }
    case "!$": {
      const a = String(actual ?? "");
      return ci ? !a.toLowerCase().endsWith(value.toLowerCase()) : !a.endsWith(value);
    }
  }
}

export function matchNode(record: unknown, node: Node): boolean {
  switch (node.kind) {
    case "cond":
      return matchCondition(record, node.cond);
    case "or":
      return node.items.some((n) => matchNode(record, n));
    case "and":
      return node.items.every((n) => matchNode(record, n));
  }
}

/** Filter + sort + paginate a record collection, gridify-server style. */
export function applyQuery<T extends object>(
  records: T[],
  opts: { filter?: string; orderBy?: string; page?: number; pageSize?: number },
): { data: T[]; count: number; page: number; pageSize: number; totalPages: number } {
  const filter = parseFilter(opts.filter);
  let rows = filter ? records.filter((r) => matchNode(r, filter)) : [...records];

  const sorts = parseOrderBy(opts.orderBy);
  if (sorts.length > 0) {
    rows = [...rows].sort((a, b) => {
      for (const { field, descending } of sorts) {
        const cmp = compareValues(resolvePath(a, field), resolvePath(b, field));
        if (cmp !== 0) return descending ? -cmp : cmp;
      }
      return 0;
    });
  }

  const count = rows.length;
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.max(1, opts.pageSize ?? 20);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const start = (page - 1) * pageSize;
  return { data: rows.slice(start, start + pageSize), count, page, pageSize, totalPages };
}
