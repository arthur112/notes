namespace Api.Features.Fund;

public class FundEntity
{
    public int Id { get; set; }
    public Guid PublicId { get; set; }
    public required string Name { get; set; }
    public string? PermanentInformation { get; set; }
    public Periodicity Periodicity { get; set; } = Periodicity.Quarterly;
}
