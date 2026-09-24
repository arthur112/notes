using CentralLogging.Sdk;

var builder = WebApplication.CreateBuilder(args);

// One line: Serilog + HTTP sink to the central logging service, with trace IDs.
// Options come from the "CentralLogging" section in appsettings.json.
builder.AddCentralLogging();

var app = builder.Build();

app.MapGet("/hello", (ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("DemoApi.Hello");
    logger.LogInformation("Hello endpoint called at {Time}", DateTimeOffset.Now);
    return Results.Ok(new { Message = "Hello! Watch the LogServer console — the event arrives there with a TraceId." });
});

// Source-generated logging: [LoggerMessage] compiles a strongly-typed, allocation-free
// logging method (no string interpolation, no boxing, template checked at build time).
// It still flows through the same Serilog pipeline with TraceId and structured properties.
app.MapGet("/orders/{orderId:int}", (int orderId, ILoggerFactory loggerFactory) =>
{
    var logger = loggerFactory.CreateLogger("DemoApi.Orders");
    logger.OrderProcessed(orderId, "Ada Lovelace");
    return Results.Ok(new { orderId });
});

app.Run("http://localhost:5051");

internal static partial class OrderLogs
{
    [LoggerMessage(Level = LogLevel.Information, Message = "Order {OrderId} processed for {Customer}")]
    public static partial void OrderProcessed(this ILogger logger, int orderId, string customer);
}
