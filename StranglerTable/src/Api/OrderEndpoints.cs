using StranglerTable.Domain;

namespace StranglerTable.Api;

public static class OrderEndpoints
{
    public static void Map(WebApplication app)
    {
        MapGroup(app, "split");
        MapGroup(app, "acl");

        app.MapGet("/compare/{id:int}", async (int id,
                [FromKeyedServices("split")] IOrderStore split,
                [FromKeyedServices("acl")] IOrderStore acl,
                CancellationToken ct) =>
            {
                var fromSplit = await split.GetByIdAsync(id, ct);
                var fromAcl = await acl.GetByIdAsync(id, ct);
                if (fromSplit is null || fromAcl is null) return Results.NotFound();
                var equal = System.Text.Json.JsonSerializer.Serialize(fromSplit)
                            == System.Text.Json.JsonSerializer.Serialize(fromAcl);
                return Results.Ok(new { equal, split = fromSplit, acl = fromAcl });
            })
            .WithName("CompareStrategies");
    }

    private static void MapGroup(WebApplication app, string key)
    {
        IOrderStore Store(HttpContext ctx) => ctx.RequestServices.GetRequiredKeyedService<IOrderStore>(key);

        var group = app.MapGroup($"/{key}/orders").WithTags(key);

        group.MapGet("/", (HttpContext ctx, CancellationToken ct) =>
            Store(ctx).GetAllAsync(ct));

        group.MapGet("/{id:int}", async (int id, HttpContext ctx, CancellationToken ct) =>
            await Store(ctx).GetByIdAsync(id, ct) is { } order ? Results.Ok(order) : Results.NotFound());

        group.MapPost("/", async (Order order, HttpContext ctx, CancellationToken ct) =>
        {
            order.Id = 0;
            if (order.Audit.CreatedAt == default)
            {
                order.Audit.CreatedAt = DateTime.UtcNow;
                order.Audit.CreatedBy = "api";
            }
            var created = await Store(ctx).AddAsync(order, ct);
            return Results.Created($"/{key}/orders/{created.Id}", created);
        });

        group.MapPut("/{id:int}", async (int id, Order order, HttpContext ctx, CancellationToken ct) =>
        {
            order.Id = id;
            order.Audit.UpdatedAt = DateTime.UtcNow;
            order.Audit.UpdatedBy = "api";
            return await Store(ctx).UpdateAsync(order, ct) is { } updated ? Results.Ok(updated) : Results.NotFound();
        });
    }
}
