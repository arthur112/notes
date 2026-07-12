using CSharpFunctionalExtensions;
using MailApi.Application.SendMail;
using MailApi.Domain;

namespace MailApi.Application.Abstractions;

public interface ITemplateRenderer
{
    Task<Result<RenderedTemplate, MailError>> RenderAsync(
        TemplateKey templateKey,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken);
}

public sealed record RenderedTemplate(string Html, string? Subject, string? Text);
