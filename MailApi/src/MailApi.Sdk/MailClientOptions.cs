namespace MailApi.Sdk;

public sealed class MailClientOptions
{
    public const string SectionName = "MailClient";

    /// <summary>Base URL of the Mail API, e.g. <c>https://mail-api.internal/</c>.</summary>
    public string BaseUrl { get; set; } = "http://localhost:5000/";

    /// <summary>Shared secret sent as the <c>X-Api-Key</c> header. Leave null if the API has auth disabled.</summary>
    public string? ApiKey { get; set; }

    public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);
}
