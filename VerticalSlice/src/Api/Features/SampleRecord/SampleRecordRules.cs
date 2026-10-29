namespace Api.Features.SampleRecord;

/// <summary><see cref="Always"/> runs last, so it wins over anything set before it.</summary>
public enum RuleKind
{
    OnCreate,
    OnChange,
    Always,
}

public sealed record RuleContext(
    SampleRecordEntity Entity,
    SampleRecordEntity? Original,
    CustomerSettingsEntity? Settings
)
{
    public bool IsCreate => Original is null;

    public bool Changed<T>(Func<SampleRecordEntity, T> field) =>
        Original is not null && !EqualityComparer<T>.Default.Equals(field(Original), field(Entity));
}

public sealed record EntityRule(
    string Name,
    RuleKind Kind,
    Func<RuleContext, bool> When,
    Action<RuleContext> Apply
);

/// <summary>
/// Every special case of the write path, as a named rule. Rules only read and assign columns:
/// no I/O, no services. Customer-specific behavior comes from <see cref="CustomerSettingsEntity"/>,
/// never from a hardcoded customer id.
/// </summary>
public static class SampleRecordRules
{
    public static readonly EntityRule TypeAStartsWithPriority1 = new(
        "Type A starts with priority 1",
        RuleKind.OnCreate,
        ctx => ctx.Entity.Type == SampleRecordType.A,
        ctx => ctx.Entity.Priority = 1
    );

    public static readonly EntityRule CustomerDefaultPaymentTerm = new(
        "Customer default payment term applied when empty",
        RuleKind.OnCreate,
        ctx =>
            ctx.Entity.PaymentTermDays is null
            && ctx.Settings?.DefaultPaymentTermDays is not null,
        ctx => ctx.Entity.PaymentTermDays = ctx.Settings!.DefaultPaymentTermDays
    );

    public static readonly EntityRule TypeChangeResetsEdi = new(
        "Type change resets the EDI columns",
        RuleKind.OnChange,
        ctx => ctx.Changed(e => e.Type),
        ClearEdi
    );

    public static readonly EntityRule EdiOnlyForTypeA = new(
        "EDI columns are only filled for type A",
        RuleKind.Always,
        ctx => ctx.Entity.Type != SampleRecordType.A,
        ClearEdi
    );

    public static readonly EntityRule ForcedCurrencyPerCustomer = new(
        "Forced currency per customer",
        RuleKind.Always,
        ctx => ctx.Settings?.ForcedCurrency is not null,
        ctx => ctx.Entity.Currency = ctx.Settings!.ForcedCurrency
    );

    public static readonly EntityRule[] All =
    [
        TypeAStartsWithPriority1,
        CustomerDefaultPaymentTerm,
        TypeChangeResetsEdi,
        EdiOnlyForTypeA,
        ForcedCurrencyPerCustomer,
    ];

    /// <summary>
    /// Runs the rules that apply to this save, ordered by <see cref="RuleKind"/>. <c>OrderBy</c> is
    /// a stable sort, so declaration order is kept within a kind.
    /// </summary>
    public static void Run(RuleContext ctx)
    {
        var rules = All.Where(r =>
                r.Kind switch
                {
                    RuleKind.OnCreate => ctx.IsCreate,
                    RuleKind.OnChange => !ctx.IsCreate,
                    _ => true,
                }
            )
            .OrderBy(r => r.Kind);

        foreach (var rule in rules)
            if (rule.When(ctx))
                rule.Apply(ctx);
    }

    private static void ClearEdi(RuleContext ctx)
    {
        ctx.Entity.EdiCode = null;
        ctx.Entity.EdiPartner = null;
    }
}
