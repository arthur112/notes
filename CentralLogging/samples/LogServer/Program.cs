using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var apiKey = app.Configuration["CentralLogging:ApiKey"] ?? "dev-key";

// This is the "central app": the Serilog HTTP sink POSTs batches of log events here
// as a JSON array. Each event carries Timestamp, Level, MessageTemplate,
// RenderedMessage, TraceId, SpanId and Properties.
app.MapPost("/logs", (HttpContext context, JsonElement[] events) =>
{
    if (!context.Request.Headers.TryGetValue("X-Api-Key", out var key) || key != apiKey)
        return Results.Unauthorized();

    Console.WriteLine($"[{DateTimeOffset.Now:HH:mm:ss}] Batch of {events.Length} event(s)");

    foreach (var e in events)
    {
        var level = Prop(e, "Level") ?? "?";
        var message = Prop(e, "RenderedMessage") ?? "";
        var traceId = Prop(e, "TraceId") ?? "-";
        var app2 = e.TryGetProperty("Properties", out var p) && p.TryGetProperty("Application", out var a)
            ? a.GetString()
            : null;

        Console.WriteLine($"  [{level}] {message}  (app: {app2 ?? "?"}, trace: {traceId})");
    }

    return Results.Accepted();

    static string? Prop(JsonElement e, string name) =>
        e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
});

app.Run("http://localhost:5050");
