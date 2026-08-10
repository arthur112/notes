namespace StranglerTable.Domain;

public class Customer
{
    public string ExternalRef { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string? Company { get; set; }
    public string? VatNumber { get; set; }
    public string Segment { get; set; } = "Standard";
}
