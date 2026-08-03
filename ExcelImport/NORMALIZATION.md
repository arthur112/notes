# Data normalization, in practice

A step-by-step guide for turning a wide, Excel-shaped table (30+ columns, 1 column per Excel column) into a normalized relational model. Every step uses the example from this note so you can see the actual SQL-ish shape, not just theory.

The running example — one Excel row per order:

```
Date        CustomerName  CustomerCity  Product1  Qty1  Price1  Product2  Qty2  Price2  Product3  Qty3  Price3
2026-01-05  Contoso       Lisbon        A-100     2     9.99    B-200     1     19.50
2026-01-06  Contoso       Lisbon        A-100     1     9.99
2026-01-07  Northwind     Porto         C-300     5     4.25    A-100     3     9.99    B-200     2     19.50
```

Naive 1:1 import table:

```sql
ImportRow(Id, Date, CustomerName, CustomerCity,
          Product1, Qty1, Price1, Product2, Qty2, Price2, Product3, Qty3, Price3)
```

---

## Step 0 — Ask two questions first

Before touching the schema:

1. **Are there repeated groups?** Columns that are the same attribute with a number suffix (`Product1/Product2/Product3`, `Contact1Email/Contact2Email`) — the strongest normalization signal.
2. **Are there hidden entities?** Clusters of columns that describe something other than the row's subject (`CustomerName/CustomerCity/CustomerPhone` on an order row describe a *customer*).

These two questions find ~90% of the wins. The formal normal forms below are just the rigorous version of them.

---

## 1NF — eliminate repeated groups, atomic values, a real key

**Rule:** every cell holds one value; no repeating column groups; each row is uniquely identifiable.

The `ProductN/QtyN/PriceN` triplets violate 1NF. Problems they cause:

- Queries become awful: "total revenue for product A-100" needs `SUM` over 3 columns × every product slot, with `UNION`s or `CASE`.
- The 4th product on an order requires a **schema change**.
- `Qty2` is meaningless without knowing which `Price2` pairs with it — the grouping exists only in the column names.

**Fix:** un-pivot the group into a child table — one row per order line:

```sql
OrderHeader(Id, Date, CustomerName, CustomerCity)          -- still not finished
OrderLine(Id, OrderId FK, ProductCode, Quantity, UnitPrice)
```

```
OrderLine: (1, 1, A-100, 2, 9.99)
           (2, 1, B-200, 1, 19.50)
           (3, 2, A-100, 1, 9.99)
           ...
```

Now revenue per product is `SELECT ProductCode, SUM(Quantity*UnitPrice) FROM OrderLine GROUP BY ProductCode`, and a 50-line order needs no schema change.

Also check for **multi-value cells** while here: `"Lisbon, Porto"` in one cell, or `"2x A-100"` — split them into rows or separate columns.

## 2NF — no attribute depends on *part* of a key

**Rule:** only relevant for tables with a **composite key**. Every non-key column must depend on the *whole* key.

Suppose you'd designed `OrderLine` with key `(OrderId, ProductCode)` and stored the order date on it for convenience:

```sql
OrderLine(OrderId, ProductCode, OrderDate, CustomerName, Quantity, UnitPrice)
```

`OrderDate` and `CustomerName` depend only on `OrderId` — half the key. Consequences: the date is duplicated on every line of the order; update one and miss the others → inconsistent data; delete the last line of an order → the order's date vanishes.

**Fix:** move partial dependencies up to the table that owns that part of the key — which our 1NF split already did (`Date` lives on `OrderHeader`, not on the lines).

**Shortcut:** if a table has a single-column surrogate key (`Id`), 2NF is automatically satisfied. This step mostly bites when you model join tables with natural composite keys.

## 3NF — no attribute depends on another non-key attribute (transitive dependency)

**Rule:** every non-key column must depend on the key, the whole key, and nothing but the key.

`OrderHeader` still has a problem:

```sql
OrderHeader(Id, Date, CustomerName, CustomerCity)
```

`CustomerCity` depends on `CustomerName`, not on the order. It is duplicated on every Contoso order. If Contoso moves to Braga you must update every row; two rows can disagree; you can't record a customer who hasn't ordered yet.

**Fix:** extract the hidden entity:

```sql
Customer(Id, Name, City)
Order(Id, Date, CustomerId FK)
OrderLine(Id, OrderId FK, ProductCode, Quantity, UnitPrice)
```

The find-or-create logic ("get the `CustomerId` for 'Contoso', creating it if unknown") lives in the import transform — see `Transform/Transformer.cs` in this note.

Tell-tale signs of transitive dependencies: clusters of columns that change together (`SupplierName/SupplierCity/SupplierPhone`), or columns you'd want to update in bulk ("fix the city for all Contoso rows").

---

## The checklist — "is this column in the right table?"

For each column ask:

1. **Does it describe the subject of this table, and nothing else?** If it describes a customer/product/supplier on an *order* table → extract that entity.
2. **Would I ever need to update it in many rows at once?** Yes → it's duplicated → extract it.
3. **Is it one of a numbered series?** → un-pivot into a child table.
4. **Can it hold several values in one cell?** → split into child rows.
5. **Can I compute it from other columns?** (`Total = Qty * Price`) → don't store it, or store it only as a deliberate, documented cache.
6. **Is it really a lookup?** (`Status`, `Category`, `Country`) → lookup table + FK if you need referential integrity or extra attributes; a plain enum/check constraint is fine for small closed lists.

## When to *stop* normalizing

Normalization is not a religion; stop when:

- **Lookup tables vs enums:** a `Countries` table with 200 rows you never maintain is ceremony. If the list is closed and small, an enum + check constraint is fine.
- **Deliberate snapshots:** an order should often keep the *price at time of purchase* even though the product has a current price. That's not duplication, it's history — but make it a conscious choice (as `OrderLine.UnitPrice` is here).
- **Reporting / star schema:** analytical models deliberately *de*normalize into wide dimension tables (`DimCustomer` carrying `City, Region, Country`) so that aggregations need few joins. That's a separate, downstream schema fed by ETL from your normalized tables — not a replacement for them.
- **Join pain in hot paths:** if a proven, measured performance problem comes from one join too many, denormalize that one spot deliberately — with the duplication managed by code or triggers, and documented.

Rule of thumb: **normalize by default, denormalize by decision, and only with a reason you can write down.**

## How the pieces fit together

```
              background job (per file)                    background job (per batch, chunked)
                      │                                              │
Excel file  →  staging tables (verbatim, 1NF-free)  →  transform/validate  →  normalized tables (3NF)
 (100k+ rows)      ImportBatches + ImportRows           per-file-type strategy    Customers, Orders,
                   rows as raw JSON, no validation      + FluentValidation        OrderLines, Products,
                      │                              per chunk of ~1000 rows      StockLevels
                      │                                     │
                      └── failed rows stay in staging for correction & reprocessing
                                                                     |
                                                                     v
                                              (optional) star schema for reporting
```

Staging absorbs the chaos of the input format; normalization makes the stored data correct and queryable; a star schema (when you need analytics) makes it fast to read. Each layer has one job. For the reasoning behind keeping both a raw staging layer *and* normalized tables (rather than importing directly into 3NF), see [ADR-001](ADR-001-hybrid-import-pipeline.md).

At scale, the pipeline is driven by background jobs (TickerQ in this note): one job streams the file into staging in chunks (flat memory, no size limit), a chained job then drains pending rows chunk by chunk through the file type's strategy. Because staging rows are durable and carry a status, a crash mid-file just means the next job run resumes where it stopped — normalization correctness doesn't depend on the import finishing in one shot.
