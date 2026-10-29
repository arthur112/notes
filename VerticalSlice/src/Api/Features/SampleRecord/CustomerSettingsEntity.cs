namespace Api.Features.SampleRecord;

/// <summary>
/// Per-customer overrides that used to be hardcoded <c>if (custId == "...")</c> branches.
/// <c>Default...</c> columns fill an empty field on create; <c>Forced...</c> columns win on every
/// save. See <see cref="SampleRecordRules"/>.
/// </summary>
public class CustomerSettingsEntity
{
    public string CustId { get; set; } = "";
    public int? DefaultPaymentTermDays { get; set; }
    public string? ForcedCurrency { get; set; }
}
