using ConnectionStringSwitching.Data;
using Microsoft.EntityFrameworkCore;

namespace ConnectionStringSwitching.Api;

public static class EmployeeEndpoints
{
    public static void MapEmployeeEndpoints(this WebApplication app)
    {
        app.MapGet("/employees", async (EmployeeContext db) =>
            Results.Ok(await db.Employees.OrderBy(e => e.Id).ToListAsync()));

        // Proves which SQL login the current request is actually using.
        app.MapGet("/db-identity", async (EmployeeContext db, HttpContext http) =>
        {
            var login = await db.Database
                .SqlQuery<string>($"SELECT SUSER_SNAME() AS Value")
                .FirstAsync();

            return Results.Ok(new
            {
                appRole = http.User.IsInRole("admin") ? "admin" : "user",
                sqlLogin = login
            });
        });
    }
}
