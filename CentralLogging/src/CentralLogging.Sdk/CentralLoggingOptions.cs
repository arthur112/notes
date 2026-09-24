using Serilog.Events;

namespace CentralLogging.Sdk;

/// <summary>
/// Options for the central logging SDK. Bound from the "CentralLogging" configuration section.
/// </summary>
public sealed class CentralLoggingOptions
{
    public const string SectionName = "CentralLogging";

    /// <summary>Ingest endpoint on the central logging service, e.g. "http://localhost:5050/logs".</summary>
    public Uri Endpoint { get; set; } = null!;

    /// <summary>API key sent as the <c>X-Api-Key</c> header on every batch POST. Optional.</summary>
    public string? ApiKey { get; set; }

    /// <summary>Name of this application; attached to every event as the <c>Application</c> property.</summary>
    public string ApplicationName { get; set; } = "UnknownApp";

    /// <summary>Minimum level for events shipped to the central service.</summary>
    public LogEventLevel MinimumLevel { get; set; } = LogEventLevel.Information;

    /// <summary>Maximum number of log events per HTTP POST batch.</summary>
    public int LogEventsInBatchLimit { get; set; } = 100;

    /// <summary>How often a non-full batch is shipped anyway.</summary>
    public TimeSpan BatchPeriod { get; set; } = TimeSpan.FromSeconds(2);
}
