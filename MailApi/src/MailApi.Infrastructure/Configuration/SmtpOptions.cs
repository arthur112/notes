namespace MailApi.Infrastructure.Configuration;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 25;
    public SmtpSecurity Security { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public MailboxOptions From { get; set; } = new();
}

public enum SmtpSecurity
{
    None,
    Auto,
    StartTls,
    StartTlsWhenAvailable,
    SslOnConnect,
}

public sealed class MailboxOptions
{
    public string Name { get; set; } = "";
    public string Address { get; set; } = "";
}
