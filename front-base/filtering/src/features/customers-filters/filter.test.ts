import { describe, expect, it } from "vitest";

import { customersFilter } from "./filter";

/** Raw URL search → the Gridify query, the same path the route takes. */
const query = (raw: Record<string, unknown>) =>
  customersFilter.toGridifyQuery(customersFilter.schema.parse(raw));

describe("customers Gridify query", () => {
  it("defaults to page 1, the first page size, no filter, no order", () => {
    expect(query({})).toEqual({ page: 1, pageSize: 5, orderBy: "", filter: "" });
  });

  it("joins every field with AND, in declaration order", () => {
    expect(
      query({
        // given first, emitted last
        created: { from: "2024-01-01", to: "2024-01-31" },
        q: " ada ",
        segment: "SMB",
        countries: ["Germany", "Sweden"],
        customers: ["CUS-1002"],
        paymentTerms: [30],
        active: false,
        creditLimit: { min: "10,5", max: "" },
        sort: [
          { id: "name", desc: true },
          { id: "createdAt", desc: false },
        ],
        page: 2,
        pageSize: 10,
      }),
    ).toEqual({
      page: 2,
      pageSize: 10,
      orderBy: "name desc, createdAt",
      filter:
        "(name=*ada|email=*ada),segment=SMB,(country=Germany|country=Sweden)," +
        "(customerNo=CUS-1002),(paymentTermsDays=30),active=false,creditLimit>=10.5," +
        "createdAt>=2024-01-01,createdAt<2024-02-01",
    });
  });

  it("drops invalid keys instead of failing", () => {
    expect(
      query({
        q: "x",
        segment: "bogus",
        page: 0,
        pageSize: 999,
        sort: [{ id: "nope", desc: true }],
      }),
    ).toEqual({ page: 1, pageSize: 5, orderBy: "", filter: "(name=*x|email=*x)" });
  });
});
