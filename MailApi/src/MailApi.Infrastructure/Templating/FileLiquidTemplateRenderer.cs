using System.Text.Encodings.Web;
using CSharpFunctionalExtensions;
using Fluid;
using Fluid.Ast;
using Fluid.Values;
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
/// <para>
/// Images stored under templates/assets/ are referenced with the <c>mail_asset</c>
/// filter, which rewrites them to a <c>cid:</c> URL and returns the file alongside the
/// HTML so the sender can embed it: <c>&lt;img src="{{ 'logo.png' | mail_asset }}" /&gt;</c>.
/// </para>
/// </summary>
public sealed class FileLiquidTemplateRenderer : ITemplateRenderer
{
    // AmbientValues keys the custom tags/filters and the renderer use to hand state to each other.
    private const string LayoutPathKey = "LayoutPath";
    private const string RenderedBodyKey = "RenderedBody";
    private const string InlineImagesKey = "InlineImages";
    private const string TemplateExtension = ".liquid";

    private readonly FluidParser _parser = new();
    private readonly TemplateOptions _options = new();
    private readonly MailAssetStore _assets;
    private readonly string _templatesPath = Path.Combine(AppContext.BaseDirectory, "templates");

    public FileLiquidTemplateRenderer()
    {
        if (!Directory.Exists(_templatesPath))
            throw new DirectoryNotFoundException($"Templates directory was not found at '{_templatesPath}'.");

        _assets = new MailAssetStore(_templatesPath);
        _parser.RegisterExpressionTag("layout", RememberLayoutPathAsync);
        _parser.RegisterEmptyTag("renderbody", WriteRenderedBody);
        _options.Filters.AddFilter("mail_asset", ResolveInlineImageAsync);
    }

    public async Task<Result<(string Html, IReadOnlyList<MailAsset> InlineImages), MailError>> RenderAsync(
        MailTemplate template,
        IReadOnlyDictionary<string, object?> data,
        CancellationToken cancellationToken)
    {
        var context = new TemplateContext(data, _options);

        // 1. Render the body — the {% layout %} tag records the layout path on the way.
        var body = await RenderFileAsync(FilePathFor(template.FileName()), context, cancellationToken);
        if (body.IsFailure)
            return Result.Failure<(string, IReadOnlyList<MailAsset>), MailError>(body.Error);

        var html = body.Value;

        // 2. A layout declared — render it on the same context; {% renderbody %} emits the body.
        if (GetLayoutPath(context) is { } layoutPath)
        {
            context.AmbientValues[RenderedBodyKey] = html;
            try
            {
                var layout = await RenderFileAsync(FilePathFor(layoutPath), context, cancellationToken);
                if (layout.IsFailure)
                    return Result.Failure<(string, IReadOnlyList<MailAsset>), MailError>(layout.Error);

                html = layout.Value;
            }
            finally
            {
                context.AmbientValues.Remove(RenderedBodyKey);
            }
        }

        return Result.Success<(string, IReadOnlyList<MailAsset>), MailError>((html, GetInlineImages(context)));
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

    /// <summary>
    /// {{ 'logo.png' | mail_asset }} loads templates/assets/logo.png, registers it as an inline
    /// image and emits the matching <c>cid:</c> URL for use in <c>src</c> attributes.
    /// </summary>
    private ValueTask<FluidValue> ResolveInlineImageAsync(
        FluidValue input,
        FilterArguments arguments,
        TemplateContext context)
    {
        var name = input.ToStringValue().Trim();
        if (name.Length == 0)
            throw new InvalidOperationException(
                "The 'mail_asset' filter needs an image file name, e.g. {{ 'logo.png' | mail_asset }}.");

        var asset = _assets.Load(name);

        if (!context.AmbientValues.TryGetValue(InlineImagesKey, out var value) ||
            value is not List<MailAsset> images)
        {
            context.AmbientValues[InlineImagesKey] = images = [];
        }

        if (!images.Any(image => image.ContentId == asset.ContentId))
            images.Add(asset);

        return new ValueTask<FluidValue>(new StringValue($"cid:{asset.ContentId}"));
    }

    private static IReadOnlyList<MailAsset> GetInlineImages(TemplateContext context) =>
        context.AmbientValues.TryGetValue(InlineImagesKey, out var value) && value is List<MailAsset> images
            ? images
            : [];

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
