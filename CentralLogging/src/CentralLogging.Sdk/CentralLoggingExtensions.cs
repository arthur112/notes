using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Serilog.Configuration;
using Serilog.Events;

namespace CentralLogging.Sdk;

public static class CentralLoggingExtensions
{
    /// <summary>
    /// Adds the batched HTTP sink that ships logs to the central logging service.
    /// Use this when you configure the Serilog pipeline yourself.
    /// </summary>
    public static LoggerConfiguration CentralLogs(this LoggerSinkConfiguration writeTo, CentralLoggingOptions options)
    {
        ArgumentNullException.ThrowIfNull(options.Endpoint);

        return writeTo.Http(
            requestUri: options.Endpoint.ToString(),
            queueLimitBytes: null, // unbounded in-memory queue (non-durable sink)
            logEventsInBatchLimit: options.LogEventsInBatchLimit,
            period: options.BatchPeriod,
            restrictedToMinimumLevel: options.MinimumLevel,
            httpClient: new CentralLoggingHttpClient(options.ApiKey));
    }

    /// <summary>
    /// One-line setup: Serilog as the logging provider, enriched with an <c>Application</c> property
    /// and the ambient W3C <c>TraceId</c>/<c>SpanId</c> (automatic in Serilog 4 from
    /// <see cref="System.Diagnostics.Activity.Current"/>), shipping batched events over HTTP
    /// to the central logging service.
    /// Options are read from the "CentralLogging" configuration section and can be overridden in code.
    /// </summary>
    public static WebApplicationBuilder AddCentralLogging(this WebApplicationBuilder builder, Action<CentralLoggingOptions>? configure = null)
    {
        var options = builder.Configuration
            .GetSection(CentralLoggingOptions.SectionName)
            .Get<CentralLoggingOptions>() ?? new CentralLoggingOptions();

        configure?.Invoke(options);

        builder.Services.AddSerilog((_, logger) => logger
            .MinimumLevel.Is(options.MinimumLevel)
            .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Application", options.ApplicationName)
            .WriteTo.CentralLogs(options));

        return builder;
    }
}
