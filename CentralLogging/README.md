# CentralLogging

A minimal NuGet **SDK package** that configures [Serilog](https://serilog.net/) with a batched **HTTP sink** so any ASP.NET Core app can ship its logs to a central logging service — with **W3C trace IDs** for correlation.

## Layout

```
CentralLogging/
├── src/CentralLogging.Sdk/      # the NuGet package (this is the actual deliverable)
└── samples/
    ├── LogServer/               # stand-in for the central logging app (receives the batches)
    └── DemoApi/                 # consumer app: one line to opt in
```

## How it works

- `CentralLogging.Sdk` references [`Serilog.AspNetCore`](https://www.nuget.org/packages/Serilog.AspNetCore) and [`Serilog.Sinks.Http`](https://www.nuget.org/packages/Serilog.Sinks.Http). Both flow **transitively** to consumers — installing the SDK package is all a consumer needs.
- The sink POSTs **batches** of log events as a JSON array (`Timestamp`, `Level`, `MessageTemplate`, `RenderedMessage`, `TraceId`, `SpanId`, `Properties`).
- **Trace IDs are free**: Serilog 4 automatically enriches every event with `TraceId`/`SpanId` from `Activity.Current`, and ASP.NET Core creates a W3C `Activity` per request. Events outside a request (startup, background jobs) simply have no trace ID.
- Auth is added via a custom `Serilog.Sinks.Http.IHttpClient` (`CentralLoggingHttpClient`) that attaches an `X-Api-Key` header — that's the seam for any cross-cutting concern.
- The consumer's options come from a `"CentralLogging"` section in `appsettings.json` (endpoint, API key, app name, minimum level, batch size/period), overridable in code.

Consumer usage is one line:

```csharp
builder.AddCentralLogging();
```

## Run the demo

Two terminals:

```bash
dotnet run --project samples/LogServer   # central app, http://localhost:5050
dotnet run --project samples/DemoApi     # consumer,    http://localhost:5051
```

Then:

```bash
curl http://localhost:5051/hello      # plain LogInformation via ILoggerFactory
curl http://localhost:5051/orders/42  # source-generated [LoggerMessage] log
```

`/orders/{id}` demonstrates the [`LoggerMessage` source generator](https://learn.microsoft.com/dotnet/core/extensions/logger-message-generator): a `partial` method decorated with `[LoggerMessage]` that the compiler turns into a strongly-typed, allocation-free logging call (no string interpolation, no boxing, message template validated at build time). It flows through the same Serilog pipeline — the `OrderId` and `Customer` placeholders arrive as structured entries in the event's `Properties`, alongside the `TraceId`.

The LogServer console prints the received batch, e.g.:

```
[20:11:45] Batch of 1 event(s)
  [Information] Hello endpoint called at ...  (app: DemoApi, trace: c186338a2e79034e37a946ec1ccac0e9)
```

Try changing `DemoApi/appsettings.json` → `CentralLogging:ApiKey` to a wrong value and watch the sink fail with 401s.

## Build the NuGet package

```bash
dotnet pack src/CentralLogging.Sdk -c Release -o ./artifacts
# → artifacts/CentralLogging.Sdk.1.0.0.nupkg
```

Consume it from a **local folder feed** (no server needed) by adding a `nuget.config` next to a consuming solution:

```xml
<configuration>
  <packageSources>
    <add key="local" value="/path/to/CentralLogging/artifacts" />
  </packageSources>
</configuration>
```

Then `dotnet add package CentralLogging.Sdk`.

## Deliberately left out (next steps if this were real)

- **Durable mode**: the sink supports on-disk buffer files (`DurableHttpUsingFileSizeRolledBuffers`) so events survive restarts/outages. Here it's the non-durable in-memory queue.
- **Request logging middleware** (`app.UseSerilogRequestLogging()`).
- **Bootstrap logger** for startup errors before the host is built.
- **Non-web hosts**: the SDK depends on `Microsoft.AspNetCore.App`; a worker/console variant would depend on `Serilog.Extensions.Hosting` instead.
- Real persistence/querying in the central app (index `TraceId` for correlation lookups).
