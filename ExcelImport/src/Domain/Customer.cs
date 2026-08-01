namespace ExcelImport.Domain;

public class Customer
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string City { get; set; }
    public List<Order> Orders { get; set; } = [];
}
