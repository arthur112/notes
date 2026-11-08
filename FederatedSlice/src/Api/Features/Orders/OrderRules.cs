using Api.Features.Customers;

namespace Api.Features.Orders;

/// <summary><see cref="Always"/> runs last, so it wins over anything set before it.</summary>
public enum RuleKind
{
    OnCreate,
    OnChange,
    Always,
}

public sealed record RuleContext(
    OrderEntity Entity,
    OrderEntity? Original,
    CustomerEntity Customer,
    DateOnly Today
)
{
    public bool IsCreate => Original is null;

    public CustomerSettingsEntity? Settings => Customer.Settings;

    /// <summary>Today for a new order (the database stamps it on insert), the stored date otherwise.</summary>
    public DateOnly OrderDate => Original?.CreatedAt ?? Today;

    public bool Changed<T>(Func<OrderEntity, T> field) =>
        Original is not null && !EqualityComparer<T>.Default.Equals(field(Original), field(Entity));
}

/// <summary>One special case of the write path: when <see cref="When"/> matches, <see cref="Apply"/> assigns columns.</summary>
public sealed record OrderRule(
    string Name,
    RuleKind Kind,
    Func<RuleContext, bool> When,
    Action<RuleContext> Apply
);

/// <summary>
/// Every special case of the order write path, as a named rule. Rules run after the 1:1 mapping
/// and silently overwrite what it copied. They only read and assign columns: no I/O, no services.
/// Customer-specific behavior comes from <see cref="CustomerSettingsEntity"/>, never from a
/// hardcoded customer.
/// </summary>
public static class OrderRules
{
    public static readonly OrderRule CustomerInitialStatus = new(
        "New orders start in the customer's initial status",
        RuleKind.OnCreate,
        ctx => ctx.Settings?.InitialStatus is not null,
        ctx => ctx.Entity.Status = ctx.Settings!.InitialStatus!.Value
    );

    public static readonly OrderRule CustomerChangeDropsReference = new(
        "A customer change drops the previous customer's PO reference",
        RuleKind.OnChange,
        ctx => ctx.Changed(e => e.CustomerId) && !ctx.Changed(e => e.Reference),
        ctx => ctx.Entity.Reference = null
    );

    public static readonly OrderRule CustomerForcedDueDays = new(
        "Forced due days per customer",
        RuleKind.Always,
        ctx => ctx.Settings?.ForcedDueDays is not null,
        ctx => ctx.Entity.DueDate = ctx.OrderDate.AddDays(ctx.Settings!.ForcedDueDays!.Value)
    );

    public static readonly OrderRule[] All =
    [
        CustomerInitialStatus,
        CustomerChangeDropsReference,
        CustomerForcedDueDays,
    ];

    /// <summary>
    /// Runs the rules that apply to this save, ordered by <see cref="RuleKind"/>. <c>OrderBy</c> is
    /// a stable sort, so declaration order is kept within a kind.
    /// </summary>
    public static void Run(RuleContext ctx)
    {
        var rules = All.Where(rule =>
                rule.Kind switch
                {
                    RuleKind.OnCreate => ctx.IsCreate,
                    RuleKind.OnChange => !ctx.IsCreate,
                    _ => true,
                }
            )
            .OrderBy(rule => rule.Kind);

        foreach (var rule in rules)
            if (rule.When(ctx))
                rule.Apply(ctx);
    }
}
