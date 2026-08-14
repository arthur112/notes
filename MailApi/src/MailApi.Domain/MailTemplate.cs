namespace MailApi.Domain;

/// <summary>
/// The known mail templates. Each value selects a body file in templates/
/// and carries a default subject.
/// </summary>
public enum MailTemplate
{
    Welcome,
    ResetPassword,
}

public static class MailTemplateExtensions
{
    public static string FileName(this MailTemplate template) => template switch
    {
        MailTemplate.Welcome => "welcome",
        MailTemplate.ResetPassword => "reset-password",
        _ => throw new ArgumentOutOfRangeException(nameof(template), template, "Unknown mail template."),
    };

    public static string DefaultSubject(this MailTemplate template) => template switch
    {
        MailTemplate.Welcome => "Welcome aboard — please verify your email",
        MailTemplate.ResetPassword => "Reset your password",
        _ => throw new ArgumentOutOfRangeException(nameof(template), template, "Unknown mail template."),
    };

    /// <summary>
    /// Matches the wire value against the enum name or the template file name,
    /// case-insensitively (e.g. "Welcome", "welcome", "reset-password").
    /// </summary>
    public static bool TryParse(string? value, out MailTemplate template)
    {
        foreach (var candidate in Enum.GetValues<MailTemplate>())
        {
            if (string.Equals(value, candidate.ToString(), StringComparison.OrdinalIgnoreCase) ||
                string.Equals(value, candidate.FileName(), StringComparison.OrdinalIgnoreCase))
            {
                template = candidate;
                return true;
            }
        }

        template = default;
        return false;
    }
}
