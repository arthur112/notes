namespace MailApi.Web.Configuration;

public sealed class MailApiOptions
{
    public const string SectionName = "MailApi";

    /// <summary>Optional shared secret checked via the X-Api-Key header. Null or empty disables auth.</summary>
    public string? ApiKey { get; set; }
}
