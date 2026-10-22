using Gridify;
using Gridify.EntityFramework;
using GridifyHttpQuery.Api;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<CustomersDb>(options => options.UseSqlite("Data Source=customers.sqlite"));
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<QueryMethodTransformer>());

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CustomersDb>();
    db.Database.EnsureDeleted();
    db.Database.EnsureCreated();
}

app.MapOpenApi();
app.MapScalarApiReference();

// The fields a query may filter or sort on; anything else is a 400.
var mapper = new GridifyMapper<Customer>(autoGenerateMappings: true);

var customers = app.MapGroup("/api/customers").WithTags("Customers");

// Classic: the Gridify query travels in the query string.
customers.MapGet("/", ([AsParameters] GridifyQuery query, CustomersDb db, CancellationToken ct) =>
        ListCustomers(query, db, ct))
    .WithName("ListCustomers")
    .WithSummary("Filters, sorts and pages customers from a query-string Gridify query.");

// HTTP QUERY: safe and idempotent like GET, but the Gridify query travels in the body,
// so long filters never hit URL length limits or end up in access logs.
customers.MapMethods("/", [HttpMethods.Query], ([FromBody] GridifyQuery query, CustomersDb db, CancellationToken ct) =>
        ListCustomers(query, db, ct))
    .WithName("QueryCustomers")
    .WithSummary("Filters, sorts and pages customers from a Gridify query in the request body.");

app.Run();

async Task<Results<Ok<Paging<Customer>>, ValidationProblem>> ListCustomers(GridifyQuery query, CustomersDb db, CancellationToken ct) =>
    query.IsValid(mapper)
        ? TypedResults.Ok(await db.Customers.AsNoTracking().GridifyAsync(query, ct, mapper))
        : TypedResults.ValidationProblem(new Dictionary<string, string[]>
        {
            ["query"] = ["The filter or orderBy names an unknown field or is malformed."],
        });
