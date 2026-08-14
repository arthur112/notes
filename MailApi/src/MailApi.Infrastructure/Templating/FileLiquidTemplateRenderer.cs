using System.Text;
using System.Text.Encodings.Web;
using CSharpFunctionalExtensions;
using Fluid;
using MailApi.Application.Abstractions;
using MailApi.Application.SendMail;
using MailApi.Domain;

namespace MailApi.Infrastructure.Templating;

/// <summary>
/// Renders the full HTML for a mail by concatenating the shared header,
/// the template's body, and the shared footer from templates/.
/// </summary>
public sealed class FileLiquidTemplateRenderer : ITemplateRenderer
{
    private readonly FluidParser _parser = new();
    private readonly string _templatesPath = Path.Combine(AppContext.BaseDirectory, "templates");

    public FileLiquidTemplateRenderer()
    {
        if (!Directory.Exists(_templatesPath))
            throw new DirectoryNotFoundException($"Templates directory was not found at '{_templatesPath}'.");
    }

    public async Task<Result<string, MailError>> RenderAsync(
        MailTemplate template,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken)
    {
        var output = new StringBuilder();
        foreach (var fileName in new[] { "_header", template.FileName(), "_footer" })
        {
            var result = await RenderFileAsync(
                Path.Combine(_templatesPath, $"{fileName}.liquid"), data, cancellationToken);
            if (result.IsFailure)
                return result;

            output.Append(result.Value);
        }

        return Result.Success<string, MailError>(output.ToString());
    }

    private async Task<Result<string, MailError>> RenderFileAsync(
        string path,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken)
    {
        string source;
        try
        {
            source = await File.ReadAllTextAsync(path, cancellationToken);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            return Result.Failure<string, MailError>(MailError.TemplateUnavailable(exception));
        }

        if (!_parser.TryParse(source, out var template, out _))
            return Result.Failure<string, MailError>(
                MailError.TemplateInvalid($"'{Path.GetFileName(path)}' contains invalid Liquid syntax."));

        try
        {
            var output = await template.RenderAsync(
                new TemplateContext(data),
                HtmlEncoder.Default,
                isolateContext: true);
            return Result.Success<string, MailError>(output);
        }
        catch (InvalidOperationException exception)
        {
            return Result.Failure<string, MailError>(
                MailError.TemplateInvalid("The template could not be rendered.", exception));
        }
    }
}
