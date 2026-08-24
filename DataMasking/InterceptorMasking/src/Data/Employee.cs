namespace InterceptorMasking.Data;

public sealed class Employee
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";

    [Masked(MaskKind.Email)]
    public string Email { get; set; } = "";

    [Masked(MaskKind.Phone)]
    public string? Phone { get; set; }

    [Masked(MaskKind.Zero)]
    public decimal Salary { get; set; }

    // Masked via a VALUE CONVERTER (see EmployeeContext.OnModelCreating), not the
    // interceptor — that's why there's no [Masked] attribute here.
    public string? Iban { get; set; }
}
