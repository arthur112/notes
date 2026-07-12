using System.Collections.Concurrent;
using System.Text.Encodings.Web;
using CSharpFunctionalExtensions;
using Fluid;
using Fluid.Ast;
using MailApi.Application.Abstractions;
using MailApi.Application.SendMail;
using MailApi.Domain;

namespace MailApi.Infrastructure.Templating;

public sealed class FileLiquidTemplateRenderer : ITemplateRenderer
{
    private readonly FluidParser _parser = new();
    private readonly ConcurrentDictionary<string, (long LastWriteTicks, IFluidTemplate Template)> _cache = new();
    private readonly string _templatesPath = Path.Combine(AppContext.BaseDirectory, "templates");

    public FileLiquidTemplateRenderer()
    {
        if (!Directory.Exists(_templatesPath))
            throw new DirectoryNotFoundException($"Templates directory was not found at '{_templatesPath}'.");
    }

    public async Task<Result<RenderedTemplate, MailError>> RenderAsync(
        TemplateKey templateKey,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken)
    {
        var htmlResult = await RenderRequiredAsync(
            GetPath(templateKey, null),
            data,
            HtmlEncoder.Default,
            cancellationToken);
        if (htmlResult.IsFailure)
            return Result.Failure<RenderedTemplate, MailError>(htmlResult.Error);

        var subjectResult = await RenderOptionalAsync(
            GetPath(templateKey, "subject"),
            data,
            NullEncoder.Default,
            cancellationToken);
        if (subjectResult.IsFailure)
            return Result.Failure<RenderedTemplate, MailError>(subjectResult.Error);

        var textResult = await RenderOptionalAsync(
            GetPath(templateKey, "text"),
            data,
            NullEncoder.Default,
            cancellationToken);
        if (textResult.IsFailure)
            return Result.Failure<RenderedTemplate, MailError>(textResult.Error);

        return Result.Success<RenderedTemplate, MailError>(
            new RenderedTemplate(htmlResult.Value, subjectResult.Value, textResult.Value));
    }

    private string GetPath(TemplateKey templateKey, string? companion) => Path.Combine(
        _templatesPath,
        companion is null
            ? $"{templateKey.Value}.liquid"
            : $"{templateKey.Value}.{companion}.liquid");

    private async Task<Result<string, MailError>> RenderRequiredAsync(
        string path,
        IReadOnlyDictionary<string, object?> data,
        TextEncoder encoder,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
            return Result.Failure<string, MailError>(
                MailError.TemplateNotFound(Path.GetFileNameWithoutExtension(path)));

        return await RenderFileAsync(path, data, encoder, cancellationToken);
    }

    private async Task<Result<string?, MailError>> RenderOptionalAsync(
        string path,
        IReadOnlyDictionary<string, object?> data,
        TextEncoder encoder,
        CancellationToken cancellationToken)
    {
        if (!File.Exists(path))
            return Result.Success<string?, MailError>(null);

        var result = await RenderFileAsync(path, data, encoder, cancellationToken);
        return result.IsSuccess
            ? Result.Success<string?, MailError>(result.Value)
            : Result.Failure<string?, MailError>(result.Error);
    }

    private async Task<Result<string, MailError>> RenderFileAsync(
        string path,
        IReadOnlyDictionary<string, object?> data,
        TextEncoder encoder,
        CancellationToken cancellationToken)
    {
        var templateResult = await GetOrParseAsync(path, cancellationToken);
        if (templateResult.IsFailure)
            return Result.Failure<string, MailError>(templateResult.Error);

        try
        {
            var output = await templateResult.Value.RenderAsync(
                new TemplateContext(data),
                encoder,
                isolateContext: true);
            return Result.Success<string, MailError>(output);
        }
        catch (InvalidOperationException exception)
        {
            return Result.Failure<string, MailError>(
                MailError.TemplateInvalid("The template could not be rendered.", exception));
        }
    }

    private async Task<Result<IFluidTemplate, MailError>> GetOrParseAsync(
        string path,
        CancellationToken cancellationToken)
    {
        try
        {
            var lastWriteTicks = File.GetLastWriteTimeUtc(path).Ticks;
            if (_cache.TryGetValue(path, out var entry) && entry.LastWriteTicks == lastWriteTicks)
                return Result.Success<IFluidTemplate, MailError>(entry.Template);

            var source = await File.ReadAllTextAsync(path, cancellationToken);
            if (!_parser.TryParse(source, out var template, out _))
                return Result.Failure<IFluidTemplate, MailError>(
                    MailError.TemplateInvalid("The template contains invalid Liquid syntax."));

            _cache[path] = (lastWriteTicks, template);
            return Result.Success<IFluidTemplate, MailError>(template);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            return Result.Failure<IFluidTemplate, MailError>(MailError.TemplateUnavailable(exception));
        }
    }
}
