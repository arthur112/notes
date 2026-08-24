using ConnectionStringSwitching.Api;
using ConnectionStringSwitching.Auth;
using ConnectionStringSwitching.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ConnectionStringProvider>();
builder.Services.AddDbContext<EmployeeContext>((sp, options) =>
    options.UseSqlServer(sp.GetRequiredService<ConnectionStringProvider>().Current));

var app = builder.Build();

await SchemaRunner.ApplyAsync(app.Configuration.GetConnectionString("Bootstrap")!);

app.UseMiddleware<FakeAuthMiddleware>();
app.MapEmployeeEndpoints();

app.Run();
