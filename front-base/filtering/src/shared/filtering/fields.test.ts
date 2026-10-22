import { GridifyQueryBuilder } from "gridify-client";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { FilterFieldSpec } from "./definition";
import {
  booleanSelectField,
  dateRangeField,
  multiSelectField,
  numberRangeField,
  searchField,
  selectField,
} from "./fields";

/** Raw input → the field's Gridify filter; `undefined` = it settled to "no constraint". */
function filterOf<V, I>(field: FilterFieldSpec<V, I>, input: unknown) {
  const value = field.schema.parse(input);
  if (value === undefined) return undefined;
  const builder = new GridifyQueryBuilder();
  field.apply(builder, value);
  return builder.build().filter;
}

describe("searchField", () => {
  const field = searchField({ placeholder: "", ariaLabel: "", fields: ["name", "email"] });

  it.each([
    [" ada ", "(name=*ada|email=*ada)"],
    // the router JSON-parses `?q=123` into a number
    [123, "(name=*123|email=*123)"],
    // Gridify's special characters are escaped
    ["a,b|c", "(name=*a\\,b\\|c|email=*a\\,b\\|c)"],
    ["   ", undefined],
    [null, undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });
});

describe("selectField", () => {
  const field = selectField({
    label: "",
    field: "segment",
    source: { options: [] },
    schema: z.enum(["SMB", "Enterprise"]),
  });

  it.each([
    ["SMB", "segment=SMB"],
    ["bogus", undefined],
    [null, undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });
});

describe("booleanSelectField", () => {
  const field = booleanSelectField({ label: "", field: "active" });

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

describe("multiSelectField", () => {
  const field = multiSelectField({
    label: "",
    field: "country",
    source: { options: [] },
    schema: z.enum(["Germany", "Sweden"]),
  });

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
    const terms = multiSelectField({
      label: "",
      field: "paymentTermsDays",
      source: { options: [] },
      schema: z.number(),
    });
    expect(filterOf(terms, [30, 60])).toBe("(paymentTermsDays=30|paymentTermsDays=60)");
  });
});

describe("numberRangeField", () => {
  const field = numberRangeField({ label: "", field: "creditLimit" });

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

describe("dateRangeField", () => {
  const field = dateRangeField({ label: "", field: "createdAt" });

  it.each([
    // inclusive `to` → exclusive next day
    [{ from: "2024-01-01", to: "2024-01-31" }, "createdAt>=2024-01-01,createdAt<2024-02-01"],
    [{ from: null, to: "2024-12-31" }, "createdAt<2025-01-01"],
    [{ from: null, to: "2024-02-28" }, "createdAt<2024-02-29"],
    [{ from: "nope", to: null }, undefined],
    [{ from: null, to: null }, undefined],
  ])("%j → %s", (input, expected) => {
    expect(filterOf(field, input)).toBe(expected);
  });
});
