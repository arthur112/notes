using InterceptorMasking.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace InterceptorMasking.Api;

public static class EmployeeEndpoints
{
    private sealed record EmployeeDto(
        string FirstName, string LastName, string Email, string? Phone, decimal Salary, string? Iban);

    public static void MapEmployeeEndpoints(this WebApplication app)
    {
        // Through EF Core -> the interceptor masks for non-admins.
        app.MapGet("/employees", async (EmployeeContext db) =>
            Results.Ok(await db.Employees.OrderBy(e => e.Id).ToListAsync()));

        // DTO projection: no entity is ever materialized, so the INTERCEPTOR is
        // bypassed (email/phone/salary come back clear even for non-admins) —
        // but the VALUE CONVERTER still applies, because it runs at column-read
        // level (iban stays masked).
        app.MapGet("/employees/dto", async (EmployeeContext db) =>
            Results.Ok(await db.Employees
                .OrderBy(e => e.Id)
                .Select(e => new EmployeeDto(e.FirstName, e.LastName, e.Email, e.Phone, e.Salary, e.Iban))
                .ToListAsync()));

        // Raw ADO.NET on the same connection string -> bypasses EF, so bypasses
        // the interceptor. This endpoint exists to make the weak spot of
        // app-level masking visible: the data is clear everywhere except the
        // EF materialization path.
        app.MapGet("/employees/raw", async (IConfiguration config) =>
        {
            var rows = new List<Dictionary<string, object?>>();
            await using var conn = new SqlConnection(config.GetConnectionString("App"));
            await conn.OpenAsync();
            await using var cmd = new SqlCommand(
                "SELECT Id, FirstName, LastName, Email, Phone, Salary, Iban FROM dbo.Employees ORDER BY Id", conn);
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                rows.Add(Enumerable.Range(0, reader.FieldCount)
                    .ToDictionary(reader.GetName, i => reader.IsDBNull(i) ? null : reader.GetValue(i)));
            }
            return Results.Ok(rows);
        });
    }
}
