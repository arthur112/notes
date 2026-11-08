# Write rules

Create and update each have **their own write path**, so the two can evolve separately, but both use the same mapper and the same rules. Every special case of saving an order is a **named rule** in one list, instead of an `if (customer == "…")` branch inside a handler. A rule assigns columns **silently**: it overwrites what the user entered, and the save succeeds. Customer-specific values come from **per-customer settings** (a table), never from customer IDs in code.

| Without rules | With rules |
| --- | --- |
| `if (customer.Name == "Hooli") order.Status = Paid;` in create, copied into import, forgotten in update | One `OrderRule` named "New orders start in the customer's initial status", in one list, run by every write |
| Adding a customer with a special contract = a code change and a deployment | Adding a customer with a special contract = one row in `customer_settings` |
| "Which special cases exist?" = grep the handlers | "Which special cases exist?" = read `OrderRules.All` |

Code: `src/Api/Features/Orders/` (`CreateOrder.cs`, `UpdateOrder.cs`, `OrderMapper.cs`, `OrderRules.cs`) and `src/Api/Features/Customers/CustomerSettingsEntity.cs`.

## 1. The write paths

`CreateOrder` (`POST /api/orders`) and `UpdateOrder` (`PUT /api/orders/{orderNo}`) each hold their own write path in a private method (`CreateOrder.BuildAsync`, `UpdateOrder.ApplyAsync`), next to the handler. They are the only code that assigns order columns. The steps are the same today; the split lets one change without the other (credit hold blocking edits, say), and makes the mode explicit: create passes `Original: null` to the rules, update passes the snapshot.

```text
request body
  │ .NET 10 validation attributes on OrderInput / OrderLine (before the handler runs)
  │   missing dueDate, quantity 0, no lines… → 400, the handler never runs
  ▼
CreateOrder.BuildAsync                          UpdateOrder: order = stored order + lines (tracked), or 404
                                                  ▼
                                                UpdateOrder.ApplyAsync
  ① customer = Customers.Include(c => c.Settings).FirstOrDefault(c => c.Name == input.Customer)
       null → 400 { customer: "Unknown customer." }               (stops: the rules need a customer)
     customer.IsOnHold → error { customer: "Umbrella is on credit hold." }   (collected, path continues)
  ② create: order = new OrderEntity()           update: original = snapshot of the stored values
  ③ order.MapFrom(input, customer)                                 (plain 1:1 copy)
  ④ OrderRules.Run(new RuleContext(order, null | original, customer, today))   (may overwrite ③)
  ⑤ order.Reference used by another order → error { reference: "Already used on another order" }
       (update excludes the order itself: o.Id != order.Id)
  ⑥ errors empty ? Success(order) : Failure(ValidationError(errors))
  ▼
Success → (create: db.Orders.Add) → SaveChanges → 201 / 200, body = order.ToDetail() (the values as saved)
Failure → SaveChanges is skipped → 400 problem+json with every error
```

Each handler is a pipeline around its write path:

```csharp
// UpdateOrder
var result = await Maybe<OrderEntity>
    .From(await db.Orders.Include(o => o.Lines).FirstOrDefaultAsync(o => o.OrderNo == orderNo))
    .ToResult((IHttpError)new NotFoundError())
    .Bind(order => ApplyAsync(order, request, db, clock))
    .Tap(_ => db.SaveChangesAsync())
    .Map(order => order.ToDetail());
```

Each step in detail:

- **① Customer.** Orders name their customer (the form sends the name), so the lookup is by name, a unique index on `customers.name`. `Include(c => c.Settings)` loads the settings row in the same query. Rules do no I/O, so everything they read must be loaded here.
- **Credit hold** is a validation, not a rule: a rule changes a value, and there is nothing to change about a customer on hold. The error is collected and the path continues, so a reference conflict (⑤) is reported in the same response.
- **② Snapshot.** `db.Entry(order).OriginalValues.ToObject()` builds a detached `OrderEntity` holding the column values as loaded from the database (`CustomerId`, `Status`, `DueDate`, `Reference`, `CreatedAt`, …). It is taken **before** ③ overwrites the tracked entity. It holds scalar columns only: `Customer` is `null` and `Lines` is empty. Create has nothing stored and passes `null`, which is how a rule knows it is a create.
- **③ Mapping** copies the input as is (see [The mapper](#2-the-mapper)).
- **④ Rules** run on the mapped entity and may overwrite any column (see [The rules](#3-the-rules)).
- **⑤ Reference uniqueness** needs a query, so it is not a rule. It runs **after** the rules, on the order's final reference. A rule may clear the reference, and a cleared reference can't conflict.
- **⑥ Failure leaves nothing behind.** ③ and ④ mutated the tracked entity, but on failure the `Result` pipeline skips `SaveChanges`, and the `DbContext` is scoped to the request. The filtered unique index `orders_reference` remains the last guard against two concurrent saves of one reference: that race is a `500`, not a `400`.
- **"Today"** is `DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime)`, where `clock` is the `TimeProvider` registered in `Program.cs` (`TimeProvider.System`), so tests can pin it. It matches the database's own stamp on insert (`created_at DEFAULT CAST(SYSUTCDATETIME() AS date)`), apart from a save that straddles midnight UTC.

## 2. The mapper

`OrderMapper` is a C# 14 extension block on `OrderEntity`:

```csharp
extension(OrderEntity target)
{
    public void MapFrom(OrderInput input, CustomerEntity customer) { … }  // input → columns
    public OrderDetail ToDetail() => new(…);                             // columns → response
}
```

- **1:1 copy, no business logic.** It sets `CustomerId` and `Customer`, `Status`, `DueDate`, `Reference`, and replaces the lines (`Lines.Clear()` + `AddRange`, so `PUT` is a full replacement and EF deletes the orphaned lines). Everything conditional belongs in a rule.
- **Never written:** `Id` and `OrderNo` (identity + computed column) and `CreatedAt` (database default). The database owns them.
- **Why no mapping library:** the copy is explicit and debuggable, and the mapper and the rules are the only writers. A forgotten column is not a build error, though. `OrderMapperTests` catches it: a fully filled `OrderInput` must leave no entity property (except the three above) at its default value.

## 3. The rules

### Shape

```csharp
public sealed record OrderRule(
    string Name,                     // what the rule does, in business words
    RuleKind Kind,                   // OnCreate | OnChange | Always
    Func<RuleContext, bool> When,    // does it apply to this save?
    Action<RuleContext> Apply        // assigns columns on ctx.Entity
);
```

A rule is data: a name, when it runs, a condition and an assignment. It has no access to the database or to services, so it can be tested on a hand-built object.

### The context

```csharp
public sealed record RuleContext(OrderEntity Entity, OrderEntity? Original, CustomerEntity Customer, DateOnly Today)
{
    public bool IsCreate => Original is null;
    public CustomerSettingsEntity? Settings => Customer.Settings;
    public DateOnly OrderDate => Original?.CreatedAt ?? Today;
    public bool Changed<T>(Func<OrderEntity, T> field) =>
        Original is not null && !EqualityComparer<T>.Default.Equals(field(Original), field(Entity));
}
```

| Member | Meaning |
| --- | --- |
| `Entity` | The order after mapping: what will be saved. The only thing a rule writes to. |
| `Original` | The snapshot from ②, or `null` on create. |
| `Customer`, `Settings` | The resolved customer and its settings row (`null` when it has none). |
| `Today` | The UTC day from the `TimeProvider`. |
| `IsCreate` | `Original is null`. |
| `OrderDate` | Today on create (the row has no `CreatedAt` yet), the stored date on update. |
| `Changed(e => e.X)` | Whether the input differs from what was stored for that column. Always `false` on create. |

### Kinds and order

| Kind | Runs on | Typical use |
| --- | --- | --- |
| `OnCreate` | `POST` | A starting value: "new orders start as…" |
| `OnChange` | `PUT` | A reaction to a transition, using `Changed(…)` |
| `Always` | both | A value that must hold after every save: re-applied each time, so it also repairs data edited by other means |

```csharp
public static void Run(RuleContext ctx)
{
    var rules = All.Where(rule => rule.Kind switch
        {
            RuleKind.OnCreate => ctx.IsCreate,
            RuleKind.OnChange => !ctx.IsCreate,
            _ => true,
        })
        .OrderBy(rule => rule.Kind);   // OnCreate, then OnChange, then Always

    foreach (var rule in rules)
        if (rule.When(ctx))
            rule.Apply(ctx);
}
```

- **Order matters, because rules write.** A later rule sees, and may overwrite, what an earlier one set. Sorting by kind makes `Always` run last, so it wins over any create- or change-time value. `OrderBy` is a stable sort, so `All`'s declaration order is kept within a kind.
- **`When` is evaluated just before `Apply`**, after the earlier rules ran, so a condition can depend on a value another rule just set.
- **Silent.** `Run` returns nothing, and nothing is logged or sent back. The overwritten values simply are the order's values.

### The rules today

| Rule | Kind | When | Apply | Example |
| --- | --- | --- | --- | --- |
| New orders start in the customer's initial status | OnCreate | the customer's `initial_status` is set | `Status = initial_status` | A new Hooli order entered as Pending is saved as **Paid** (Hooli is prepaid). |
| A customer change drops the previous customer's PO reference | OnChange | `Changed(CustomerId)` and **not** `Changed(Reference)` | `Reference = null` | ORD-100101 moved from Acme to Initech with `PO-1001` left in place is saved with **no reference**. Typing a new reference in the same edit keeps it, because then `Changed(Reference)` is true. |
| Forced due days per customer | Always | the customer's `forced_due_days` is set | `DueDate = OrderDate + N` | Globex (30 days): a new order is due today + 30. Saving ORD-100102 (created 11-01-2026, due 25-01-2026) stores **10-02-2026**, whatever the form held. |

Things to know:

- **On update, the due date counts from the stored order date**, not from today. Moving an existing order to Globex gives it its original `CreatedAt` + 30.
- **`initial_status` is create-only.** A Hooli order can still go from Paid to Shipped afterwards.
- **The reference rule only exists on update**, because it needs the snapshot to know the customer changed.

## 4. Per-customer settings

`customer_settings` (`db/up/0004_create_customer_settings_table.sql`): one optional row per customer.

| Column | Type | Rule | Seeded |
| --- | --- | --- | --- |
| `customer_id` | `int`, primary key, foreign key → `customers.id` | | |
| `initial_status` | `nvarchar(20) NULL`, an `OrderStatus` name | New orders start in the customer's initial status | Hooli (CUS-1005): `Paid` |
| `forced_due_days` | `int NULL` | Forced due days per customer | Globex (CUS-1002): `30` |

- **`null` means "no rule".** Every `When` starts with `ctx.Settings?.X is not null`, so a customer without a row, or with a `null` column, behaves normally.
- **EF.** `CustomerEntity.Settings` is an optional one-to-one (`HasOne(c => c.Settings).WithOne().HasForeignKey<CustomerSettingsEntity>(s => s.CustomerId)`), with `initial_status` stored as the enum name (`HasConversion<string>()`). It lives in `Features/Customers`, since it is customer data shown by the customers list. The Orders slice reads it through `Customer.Settings`.
- **Visible, not editable.** The Customers list shows **New orders start** and **Due after** (`ListCustomers.Response.InitialStatus` / `ForcedDueDays`), sortable through the Gridify fields `settings.initialStatus` and `settings.forcedDueDays`. Because the rules are silent, this is how a user finds out why a saved order differs from what was typed. Settings change in SQL; there is no endpoint.
- **grate scripts run once.** `0004_…sql` must not be edited after it ran, because grate tracks a hash of every run-once script. A new setting is a new script (`0005_add_…sql`).

## 5. What the user sees

The rules are silent on purpose:

- **The API** returns the order **as saved**: the `201` / `200` body is `order.ToDetail()` after the rules. Scalar, or any other client, sees the overwritten values directly.
- **The shell** doesn't show that body. After a successful save, the order form navigates back to the list and publishes "Created ORD-…" / "Updated ORD-…" on the event bus. The mutation invalidates the `["orders"]` and `["order"]` queries, so the list and a reopened order show the saved values: Paid, the contract due date, the dropped reference.
- **Nothing tells the user which rule fired.** That's the trade-off of a silent override. If it's ever needed, `Run` could return the names of the rules that fired and `OrderDetail` could carry them.

## 6. What is not a rule

| Check | Where | Why not a rule |
| --- | --- | --- |
| Required fields, ranges, lengths, at least one line, due date present | Attributes on `OrderInput` / `OrderLine` | Shape of the input, rejected before any handler runs |
| Unknown customer | Write path ① | Rules need a customer; it fails instead of changing a value |
| Credit hold | Write path ① | A refusal, not an assignment |
| Reference unique | Write path ⑤ | Needs a query, and must see the reference the rules left |
| Who may save | `OrderEndpoints` (`orders.write` + `order-editor`) | Authorization ([OIDC](oidc.md)) |

The line to draw: **a rule changes a value; a validation refuses the save.** If the right answer is "this can't be saved", it belongs in the write path of `CreateOrder` / `UpdateOrder` (database needed) or on `OrderInput` (input shape only), not in `OrderRules`.

## 7. Tests

| Test | Level | How |
| --- | --- | --- |
| `OrderRulesTests` | Unit, no host, no database | Builds a `RuleContext` by hand. `Fire(rule, ctx)` applies one rule the way `Run` does (`Apply` only when `When` matches). Covers each rule's condition and written value, OnCreate skipped on update, OnChange skipped on create, and a customer without settings left untouched. |
| `OrderMapperTests` | Unit | A fully filled input leaves no entity property at its default. |
| `OrdersTests` | Integration (SQL Server, a schema per test) | `Customer_Settings_Override_The_Entered_Values`: a Hooli order entered Pending with today's due date comes back Paid, due today + 30. `Customer_Change_Drops_The_Previous_Reference`: a kept reference is dropped, a new one is kept. Plus credit hold, unknown customer and reference uniqueness. |

Builders (`tests/Api.Tests/Builders/`) set up the cases: `CustomerEntityBuilder.WithSettings(initialStatus, forcedDueDays)` and `.WithId(…)` for unit tests, `OrderEntityBuilder.WithCreatedAt(…)` for the snapshot's order date, `OrderInputBuilder.WithDueDate(…)`.

## 8. Adding a rule

1. **Customer-specific?** Add a nullable column in a new grate script (`db/up/000N_…sql`), the property on `CustomerSettingsEntity` and its configuration, and seed a customer that has it. Show it in the Customers list: `ListCustomers.Response`, a Gridify `settings.…` map if it is sortable, and `web/src/domains/customers/columns.tsx`.
2. **Write the rule** in `OrderRules`: a business name, the kind, a `When` that only reads the context, and an `Apply` that only assigns `ctx.Entity` columns. Add it to `All`. Its position only matters relative to rules of the same kind that write the same column.
3. **Data from elsewhere?** Load it in both write paths ① and add it to `RuleContext`. Rules never query.
4. **Test it** in `OrderRulesTests` (fires and writes the value, doesn't fire otherwise), and add an `OrdersTests` case if the end-to-end result matters.

No change is needed in the handlers, the mapper (unless the rule writes a new column) or the shell.
