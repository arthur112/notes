import { GridifyQueryBuilder } from "gridify-client";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  dateRangeQuery,
  multiSelectQuery,
  numberRangeQuery,
  searchQuery,
  selectQuery,
  type FieldQuery,
} from "./field-queries";

/** Raw input → the field's Gridify filter; `undefined` = it settled to "no constraint". */
function filterOf<V, I>(field: FieldQuery<V, I>, input: unknown) {
  const value = field.schema.parse(input);
  if (value === undefined) return undefined;
  const builder = new GridifyQueryBuilder();
  field.apply(builder, value);
  return builder.build().filter;
}

describe("searchQuery", () => {
  const field = searchQuery(["name", "email"]);

  it.each([
    [" ada ", "(name=*ada|email=*ada)"],
    // a number is matched strictly; the router JSON-parses `?q=123` into one
    [123, "(name=123|email=123)"],
    [" 4.5 ", "(name=4.5|email=4.5)"],
    ["a1", "(name=*a1|email=*a1)"],
    // Gridify's special characters are escaped
    ["a,b|c", "(name=*a\\,b\\|c|email=*a\\,b\\|c)"],
    ["   ", undefined],
    [null, undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });
});

describe("selectQuery", () => {
  const field = selectQuery("segment", z.enum(["SMB", "Enterprise"]));

  it.each([
    ["SMB", "segment=SMB"],
    ["bogus", undefined],
    [null, undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });

  it("compares a number key as a number", () => {
    const product = selectQuery("productId", z.number());
    expect(filterOf(product, 42)).toBe("productId=42");
    expect(filterOf(product, "42")).toBeUndefined();
  });
});

describe("selectQuery on a boolean", () => {
  const field = selectQuery("active", z.boolean());

  it.each([
    [true, "active=true"],
    // `false` is a value, not "no constraint"
    [false, "active=false"],
    ["yes", undefined],
    [null, undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });
});

describe("multiSelectQuery", () => {
  const field = multiSelectQuery("country", z.enum(["Germany", "Sweden"]));

  it.each([
    [["Germany", "Sweden"], "(country=Germany|country=Sweden)"],
    [["Germany"], "(country=Germany)"],
    // `min(1)` matters: an empty group makes the builder throw
    [[], undefined],
    [["Bogus"], undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });

  it("compares numbers as numbers", () => {
    const terms = multiSelectQuery("paymentTermsDays", z.number());
    expect(filterOf(terms, [30, 60])).toBe("(paymentTermsDays=30|paymentTermsDays=60)");
  });
});

describe("numberRangeQuery", () => {
  const field = numberRangeQuery("creditLimit");

  it.each([
    [{ min: "10,5", max: "" }, "creditLimit>=10.5"],
    [{ min: "", max: "100" }, "creditLimit<=100"],
    [{ min: "1", max: "2" }, "creditLimit>=1,creditLimit<=2"],
    // a bad bound drops only that bound
    [{ min: "abc", max: "2" }, "creditLimit<=2"],
    [{ min: "", max: "" }, undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });
});

describe("dateRangeQuery", () => {
  const field = dateRangeQuery("createdAt");

  it.each([
    // `from`'s first instant, `to`'s last, as UTC days
    [
      { from: "01-01-2024", to: "31-01-2024" },
      "createdAt>=2024-01-01T00:00:00Z,createdAt<=2024-01-31T23:59:59.999Z",
    ],
    [{ from: null, to: "31-12-2024" }, "createdAt<=2024-12-31T23:59:59.999Z"],
    [{ from: "01-07-2024", to: null }, "createdAt>=2024-07-01T00:00:00Z"],
    // the picker's local-midnight `Date`s: the day picked, whatever the time zone
    [
      { from: new Date(2024, 0, 1), to: new Date(2024, 0, 31) },
      "createdAt>=2024-01-01T00:00:00Z,createdAt<=2024-01-31T23:59:59.999Z",
    ],
    [{ from: "nope", to: null }, undefined],
    // only `dd-MM-yyyy`, and a real day
    [{ from: "2024-01-01", to: null }, undefined],
    [{ from: "31-02-2024", to: null }, undefined],
    [{ from: null, to: null }, undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });
});
