using CSharpFunctionalExtensions;
using MailApi.Application.SendMail;
using MailApi.Domain;

namespace MailApi.Application.Abstractions;

public interface IEmailSender
{
    Task<Result<string, MailError>> SendAsync(OutboundEmail email, CancellationToken cancellationToken);
}
