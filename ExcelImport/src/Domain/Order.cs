namespace ExcelImport.Domain;

public class Order
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public List<OrderLine> Lines { get; set; } = [];
}
