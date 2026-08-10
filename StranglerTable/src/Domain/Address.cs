namespace StranglerTable.Domain;

public class Address
{
    public string Street { get; set; } = "";
    public string? Street2 { get; set; }
    public string City { get; set; } = "";
    public string Zip { get; set; } = "";
    public string? State { get; set; }
    public string Country { get; set; } = "";
}
