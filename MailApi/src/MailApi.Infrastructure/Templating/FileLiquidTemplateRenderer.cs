using System.Text.Encodings.Web;
using CSharpFunctionalExtensions;
using Fluid;
using Fluid.Ast;
using MailApi.Application.Abstractions;
using MailApi.Application.SendMail;
using MailApi.Domain;

namespace MailApi.Infrastructure.Templating;

/// <summary>
/// Renders the full HTML for a mail from templates/. A body template declares its
/// surrounding chrome with the custom {% layout '_layout' %} tag; the layout marks
/// where the body lands with {% renderbody %} — the same custom-tag pattern as
/// Fluid.ViewEngine (the layout tag records a path, the renderer wraps the
/// rendered body into that layout).
/// </summary>
public sealed class FileLiquidTemplateRenderer : ITemplateRenderer
{
    // AmbientValues keys the custom tags and the renderer use to hand state to each other.
    private const string LayoutPathKey = "LayoutPath";
    private const string RenderedBodyKey = "RenderedBody";
    private const string TemplateExtension = ".liquid";

    private readonly FluidParser _parser = new();
    private readonly string _templatesPath = Path.Combine(AppContext.BaseDirectory, "templates");

    public FileLiquidTemplateRenderer()
    {
        if (!Directory.Exists(_templatesPath))
            throw new DirectoryNotFoundException($"Templates directory was not found at '{_templatesPath}'.");

        _parser.RegisterExpressionTag("layout", RememberLayoutPathAsync);
        _parser.RegisterEmptyTag("renderbody", WriteRenderedBody);
    }

    public async Task<Result<string, MailError>> RenderAsync(
        MailTemplate template,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken)
    {
        var context = new TemplateContext(data);

        // 1. Render the body — the {% layout %} tag records the layout path on the way.
        var body = await RenderFileAsync(FilePathFor(template.FileName()), context, cancellationToken);
        if (body.IsFailure)
            return body;

        // 2. No layout declared — the body stands alone.
        if (GetLayoutPath(context) is not { } layoutPath)
            return body;

        // 3. Render the layout; {% renderbody %} picks the body up from the context.
        context.AmbientValues[RenderedBodyKey] = body.Value;
        try
        {
            return await RenderFileAsync(FilePathFor(layoutPath), context, cancellationToken);
        }
        finally
        {
            context.AmbientValues.Remove(RenderedBodyKey);
        }
    }

    /// <summary>{% layout 'name' %} remembers which layout wraps the current render; an empty name clears it.</summary>
    private static async ValueTask<Completion> RememberLayoutPathAsync(
        Expression pathExpression,
        TextWriter writer,
        TextEncoder encoder,
        TemplateContext context)
    {
        var layoutPath = (await pathExpression.EvaluateAsync(context)).ToStringValue();
        context.AmbientValues[LayoutPathKey] = string.IsNullOrEmpty(layoutPath) ? null : layoutPath;
        return Completion.Normal;
    }

    /// <summary>{% renderbody %} emits the body the renderer captured — already rendered and encoded HTML.</summary>
    private static ValueTask<Completion> WriteRenderedBody(
        TextWriter writer,
        TextEncoder encoder,
        TemplateContext context)
    {
        if (!context.AmbientValues.TryGetValue(RenderedBodyKey, out var body) || body is not string bodyHtml)
            throw new InvalidOperationException("Could not render body; layouts can't be rendered directly.");

        writer.Write(bodyHtml);
        return new ValueTask<Completion>(Completion.Normal);
    }

    private static string? GetLayoutPath(TemplateContext context) =>
        context.AmbientValues.TryGetValue(LayoutPathKey, out var value) ? value as string : null;

    private string FilePathFor(string templateName) =>
        Path.Combine(_templatesPath, $"{templateName}{TemplateExtension}");

    private async Task<Result<string, MailError>> RenderFileAsync(
        string path,
        TemplateContext context,
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
                context,
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
