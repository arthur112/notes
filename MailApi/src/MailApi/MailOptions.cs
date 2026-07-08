namespace MailApi;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 25;
    public bool UseSsl { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public MailboxOptions From { get; set; } = new();
}

public sealed class MailboxOptions
{
    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
}

public sealed class MailApiOptions
{
    public const string SectionName = "MailApi";

    /// <summary>Relative to ContentRootPath unless rooted. Defaults to "templates".</summary>
    public string TemplatesPath { get; set; } = "templates";

    /// <summary>Optional shared secret checked via the X-Api-Key header. Null/empty disables auth.</summary>
    public string? ApiKey { get; set; }
}
