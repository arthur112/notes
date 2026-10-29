using Api.Features.SampleRecord;
using Api.Tests.Builders;

namespace Api.Tests;

public class SampleRecordRulesTests
{
    // Fires one rule in isolation, the way Run does: Apply only when When matches.
    private static bool Fire(EntityRule rule, RuleContext ctx)
    {
        if (!rule.When(ctx))
            return false;
        rule.Apply(ctx);
        return true;
    }

    [Test]
    public async Task TypeAStartsWithPriority1_Applies_To_Type_A()
    {
        var entity = SampleRecordEntityBuilder.Create().WithType(SampleRecordType.A).Build();

        var fired = Fire(SampleRecordRules.TypeAStartsWithPriority1, new(entity, null, null));

        await Assert.That(fired).IsTrue();
        await Assert.That(entity.Priority).IsEqualTo(1);
    }

    [Test]
    public async Task TypeAStartsWithPriority1_Does_Not_Apply_To_Other_Types()
    {
        var entity = SampleRecordEntityBuilder.Create().WithType(SampleRecordType.B).Build();

        var fired = Fire(SampleRecordRules.TypeAStartsWithPriority1, new(entity, null, null));

        await Assert.That(fired).IsFalse();
        await Assert.That(entity.Priority).IsNull();
    }

    [Test]
    public async Task CustomerDefaultPaymentTerm_Applies_When_Empty()
    {
        var entity = SampleRecordEntityBuilder.Create().WithPaymentTermDays(null).Build();
        var settings = CustomerSettingsEntityBuilder.Create().WithDefaultPaymentTermDays(45).Build();

        var fired = Fire(SampleRecordRules.CustomerDefaultPaymentTerm, new(entity, null, settings));

        await Assert.That(fired).IsTrue();
        await Assert.That(entity.PaymentTermDays).IsEqualTo(45);
    }

    [Test]
    public async Task CustomerDefaultPaymentTerm_Does_Not_Apply_When_Filled()
    {
        var entity = SampleRecordEntityBuilder.Create().WithPaymentTermDays(30).Build();
        var settings = CustomerSettingsEntityBuilder.Create().WithDefaultPaymentTermDays(45).Build();

        var fired = Fire(SampleRecordRules.CustomerDefaultPaymentTerm, new(entity, null, settings));

        await Assert.That(fired).IsFalse();
        await Assert.That(entity.PaymentTermDays).IsEqualTo(30);
    }

    [Test]
    public async Task TypeChangeResetsEdi_Applies_When_Type_Changes()
    {
        // C -> A: EdiOnlyForTypeA would keep these, so only this rule clears them.
        var original = SampleRecordEntityBuilder.Create().WithType(SampleRecordType.C).Build();
        var entity = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.A)
            .WithEdi("EDI-1", "Partner")
            .Build();

        var fired = Fire(SampleRecordRules.TypeChangeResetsEdi, new(entity, original, null));

        await Assert.That(fired).IsTrue();
        await Assert.That(entity.EdiCode).IsNull();
        await Assert.That(entity.EdiPartner).IsNull();
    }

    [Test]
    public async Task TypeChangeResetsEdi_Does_Not_Apply_When_Type_Is_Unchanged()
    {
        var original = SampleRecordEntityBuilder.Create().WithType(SampleRecordType.A).Build();
        var entity = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.A)
            .WithEdi("EDI-1", "Partner")
            .Build();

        var fired = Fire(SampleRecordRules.TypeChangeResetsEdi, new(entity, original, null));

        await Assert.That(fired).IsFalse();
        await Assert.That(entity.EdiCode).IsEqualTo("EDI-1");
    }

    [Test]
    public async Task EdiOnlyForTypeA_Applies_To_Other_Types()
    {
        var entity = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.B)
            .WithEdi("EDI-1", "Partner")
            .Build();

        var fired = Fire(SampleRecordRules.EdiOnlyForTypeA, new(entity, null, null));

        await Assert.That(fired).IsTrue();
        await Assert.That(entity.EdiCode).IsNull();
        await Assert.That(entity.EdiPartner).IsNull();
    }

    [Test]
    public async Task EdiOnlyForTypeA_Does_Not_Apply_To_Type_A()
    {
        var entity = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.A)
            .WithEdi("EDI-1", "Partner")
            .Build();

        var fired = Fire(SampleRecordRules.EdiOnlyForTypeA, new(entity, null, null));

        await Assert.That(fired).IsFalse();
        await Assert.That(entity.EdiCode).IsEqualTo("EDI-1");
    }

    [Test]
    public async Task ForcedCurrencyPerCustomer_Applies_When_Customer_Has_One()
    {
        var entity = SampleRecordEntityBuilder.Create().WithCurrency("USD").Build();
        var settings = CustomerSettingsEntityBuilder.Create().WithForcedCurrency("EUR").Build();

        var fired = Fire(SampleRecordRules.ForcedCurrencyPerCustomer, new(entity, null, settings));

        await Assert.That(fired).IsTrue();
        await Assert.That(entity.Currency).IsEqualTo("EUR");
    }

    [Test]
    public async Task ForcedCurrencyPerCustomer_Does_Not_Apply_Without_Settings()
    {
        var entity = SampleRecordEntityBuilder.Create().WithCurrency("USD").Build();

        var fired = Fire(SampleRecordRules.ForcedCurrencyPerCustomer, new(entity, null, null));

        await Assert.That(fired).IsFalse();
        await Assert.That(entity.Currency).IsEqualTo("USD");
    }

    [Test]
    public async Task Run_Forced_Currency_Wins_Over_Value_Set_Earlier()
    {
        var entity = SampleRecordEntityBuilder.Create().WithCurrency("USD").Build();
        var settings = CustomerSettingsEntityBuilder.Create().WithForcedCurrency("EUR").Build();

        SampleRecordRules.Run(new(entity, null, settings));

        await Assert.That(entity.Currency).IsEqualTo("EUR");
    }

    [Test]
    public async Task Run_On_Update_Does_Not_Apply_OnCreate_Rules()
    {
        var original = SampleRecordEntityBuilder.Create().WithType(SampleRecordType.A).Build();
        var entity = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.A)
            .WithPriority(7)
            .Build();

        SampleRecordRules.Run(new(entity, original, null));

        await Assert.That(entity.Priority).IsEqualTo(7);
    }

    [Test]
    public async Task Run_Update_From_A_To_B_Resets_Edi()
    {
        var original = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.A)
            .WithEdi("EDI-1", "Partner")
            .Build();
        var entity = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.B)
            .WithEdi("EDI-1", "Partner")
            .Build();

        SampleRecordRules.Run(new(entity, original, null));

        await Assert.That(entity.EdiCode).IsNull();
        await Assert.That(entity.EdiPartner).IsNull();
    }

    [Test]
    public async Task Run_Update_Without_Type_Change_Keeps_Edi()
    {
        var original = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.A)
            .WithEdi("EDI-1", "Partner")
            .Build();
        var entity = SampleRecordEntityBuilder
            .Create()
            .WithType(SampleRecordType.A)
            .WithEdi("EDI-1", "Partner")
            .Build();

        SampleRecordRules.Run(new(entity, original, null));

        await Assert.That(entity.EdiCode).IsEqualTo("EDI-1");
        await Assert.That(entity.EdiPartner).IsEqualTo("Partner");
    }
}
