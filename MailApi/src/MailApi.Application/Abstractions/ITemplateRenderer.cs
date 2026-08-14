using CSharpFunctionalExtensions;
using MailApi.Application.SendMail;
using MailApi.Domain;

namespace MailApi.Application.Abstractions;

public interface ITemplateRenderer
{
    Task<Result<string, MailError>> RenderAsync(
        MailTemplate template,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken);
}
