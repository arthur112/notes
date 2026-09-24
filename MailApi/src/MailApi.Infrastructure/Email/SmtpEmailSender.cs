using System.Net.Sockets;
using CSharpFunctionalExtensions;
using MailApi.Application.Abstractions;
using MailApi.Application.SendMail;
using MailApi.Domain;
using MailApi.Infrastructure.Configuration;
using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using MimeKit.Utils;

namespace MailApi.Infrastructure.Email;

public sealed class SmtpEmailSender(
    IOptions<SmtpOptions> smtpOptions,
    ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task<Result<string, MailError>> SendAsync(
        OutboundEmail email,
        CancellationToken cancellationToken)
    {
        var smtp = smtpOptions.Value;
        MimeMessage message;

        try
        {
            message = new MimeMessage
            {
                From = { new MailboxAddress(smtp.From.Name, smtp.From.Address) },
                MessageId = MimeUtils.GenerateMessageId(),
                Subject = email.Subject,
            };

            foreach (var recipient in email.To)
                message.To.Add(MailboxAddress.Parse(recipient));
            foreach (var recipient in email.Cc)
                message.Cc.Add(MailboxAddress.Parse(recipient));

            var body = new BodyBuilder { HtmlBody = email.HtmlBody };
            foreach (var image in email.InlineImages)
            {
                var part = new MimePart(image.ContentType)
                {
                    Content = new MimeContent(new MemoryStream(image.Content)),
                    ContentId = image.ContentId,
                    ContentDisposition = new ContentDisposition(ContentDisposition.Inline),
                    ContentTransferEncoding = ContentEncoding.Base64,
                };
                part.ContentType.Name = image.FileName;
                body.LinkedResources.Add(part);
            }

            // ContentType.Parse throws MimeKit.ParseException on a garbage media type,
            // which the catch below maps to a 400 validation error.
            foreach (var attachment in email.Attachments)
                body.Attachments.Add(attachment.FileName, attachment.Content, ContentType.Parse(attachment.ContentType));

            message.Body = body.ToMessageBody();
        }
        catch (MimeKit.ParseException)
        {
            return Result.Failure<string, MailError>(
                MailError.Validation("One or more email addresses are invalid."));
        }

        using var client = new SmtpClient();
        try
        {
            var socketOptions = smtp.Security switch
            {
                SmtpSecurity.None => SecureSocketOptions.None,
                SmtpSecurity.Auto => SecureSocketOptions.Auto,
                SmtpSecurity.StartTls => SecureSocketOptions.StartTls,
                SmtpSecurity.StartTlsWhenAvailable => SecureSocketOptions.StartTlsWhenAvailable,
                SmtpSecurity.SslOnConnect => SecureSocketOptions.SslOnConnect,
                _ => throw new InvalidOperationException($"Unknown SMTP security mode '{smtp.Security}'."),
            };
            await client.ConnectAsync(smtp.Host, smtp.Port, socketOptions, cancellationToken);
            if (!string.IsNullOrEmpty(smtp.Username))
            {
                if (!client.IsSecure)
                    return Result.Failure<string, MailError>(MailError.Delivery(
                        new InvalidOperationException("SMTP authentication requires an encrypted connection.")));

                await client.AuthenticateAsync(smtp.Username, smtp.Password ?? "", cancellationToken);
            }
            await client.SendAsync(message, cancellationToken);
        }
        catch (Exception exception) when (exception is SmtpCommandException or SmtpProtocolException or ServiceNotConnectedException or ServiceNotAuthenticatedException or IOException or SocketException or System.Security.Authentication.AuthenticationException or MailKit.Security.AuthenticationException or NotSupportedException)
        {
            return Result.Failure<string, MailError>(MailError.Delivery(exception));
        }

        try
        {
            await client.DisconnectAsync(true, CancellationToken.None);
        }
        catch (Exception exception) when (exception is SmtpCommandException or SmtpProtocolException or IOException or SocketException)
        {
            logger.LogWarning(exception, "SMTP disconnect failed after message {MessageId} was accepted", message.MessageId);
        }

        return Result.Success<string, MailError>(message.MessageId);
    }
}
