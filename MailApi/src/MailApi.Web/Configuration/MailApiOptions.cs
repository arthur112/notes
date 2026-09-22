namespace MailApi.Web.Configuration;

public sealed class MailApiOptions
{
    public const string SectionName = "MailApi";

    /// <summary>
    /// Applications allowed to call the API, each with its own X-Api-Key.
    /// No enabled application with a key means auth is disabled.
    /// </summary>
    public IList<MailApiApplication> Applications { get; set; } = [];

    /// <summary>True when at least one enabled application declares a non-empty key.</summary>
    public bool IsAuthEnabled =>
        Applications.Any(application => application.Enabled && !string.IsNullOrEmpty(application.ApiKey));

    /// <summary>
    /// True when auth is disabled, or when <paramref name="providedKey"/> matches any enabled application's key.
    /// </summary>
    public bool IsAuthorized(string? providedKey) =>
        !IsAuthEnabled ||
        (!string.IsNullOrEmpty(providedKey)
            && Applications.Any(application =>
                application.Enabled
                && !string.IsNullOrEmpty(application.ApiKey)
                && application.ApiKey == providedKey));
}

public sealed class MailApiApplication
{
    /// <summary>Human-readable application name, used in logs and the OpenAPI description.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Shared secret accepted as the X-Api-Key header for this application.</summary>
    public string? ApiKey { get; set; }

    /// <summary>What this application uses the mail API for.</summary>
    public string? Description { get; set; }

    /// <summary>Disabled applications are rejected even when their key matches.</summary>
    public bool Enabled { get; set; } = true;
}
