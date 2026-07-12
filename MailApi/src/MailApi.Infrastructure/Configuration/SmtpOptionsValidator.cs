using MailKit;
using Microsoft.Extensions.Options;
using MimeKit;

namespace MailApi.Infrastructure.Configuration;

public sealed class SmtpOptionsValidator : IValidateOptions<SmtpOptions>
{
    public ValidateOptionsResult Validate(string? name, SmtpOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Host))
            return ValidateOptionsResult.Fail("Smtp:Host is required.");

        if (options.Port is < 1 or > 65535)
            return ValidateOptionsResult.Fail("Smtp:Port must be between 1 and 65535.");

        if (!Enum.IsDefined(options.Security))
            return ValidateOptionsResult.Fail("Smtp:Security is invalid.");

        if (string.IsNullOrWhiteSpace(options.From.Address))
            return ValidateOptionsResult.Fail("Smtp:From:Address is required.");

        if (!string.IsNullOrEmpty(options.Username) &&
            options.Security is not SmtpSecurity.StartTls and not SmtpSecurity.SslOnConnect)
            return ValidateOptionsResult.Fail(
                "Authenticated SMTP requires Smtp:Security to be StartTls or SslOnConnect.");

        if (string.IsNullOrEmpty(options.Username) && !string.IsNullOrEmpty(options.Password))
            return ValidateOptionsResult.Fail("Smtp:Username is required when Smtp:Password is set.");

        try
        {
            var mailbox = MailboxAddress.Parse(options.From.Address);
            if (!string.Equals(mailbox.Address, options.From.Address, StringComparison.OrdinalIgnoreCase))
                return ValidateOptionsResult.Fail("Smtp:From:Address must contain only the email address.");
        }
        catch (ParseException)
        {
            return ValidateOptionsResult.Fail("Smtp:From:Address must be a valid email address.");
        }

        return ValidateOptionsResult.Success;
    }
}
