using System.Text;
using MailApi.Domain;

namespace MailApi.Infrastructure.Templating;

/// <summary>
/// Loads images from the <c>templates/assets/</c> directory and hands them back as
/// <see cref="MailAsset"/> linked resources. The Content-Id is derived from the file
/// path, so the <c>cid:</c> value written into the HTML and the MIME part always agree.
/// </summary>
internal sealed class MailAssetStore
{
    public const string FolderName = "assets";
    private const string ContentIdDomain = "mailapi.local";

    private static readonly Dictionary<string, string> ContentTypesByExtension = new(StringComparer.OrdinalIgnoreCase)
    {
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".gif"] = "image/gif",
        [".webp"] = "image/webp",
        [".bmp"] = "image/bmp",
        [".svg"] = "image/svg+xml",
    };

    private readonly string _assetsPath;

    public MailAssetStore(string templatesPath) =>
        _assetsPath = Path.Combine(templatesPath, FolderName);

    /// <param name="path">Asset path relative to <c>templates/assets/</c> (e.g. <c>logo.png</c>).</param>
    public MailAsset Load(string path)
    {
        var fullPath = ResolveWithinAssets(path);

        if (!File.Exists(fullPath))
            throw new InvalidOperationException(
                $"Mail asset '{path}' was not found under templates/{FolderName}/.");

        if (!ContentTypesByExtension.TryGetValue(Path.GetExtension(fullPath), out var contentType))
            throw new InvalidOperationException(
                $"Mail asset '{path}' has an unsupported image type — use png, jpg, gif, webp or bmp " +
                "(svg is accepted but ignored by most mail clients).");

        return new MailAsset(ContentIdFor(path), Path.GetFileName(fullPath), contentType, File.ReadAllBytes(fullPath));
    }

    private string ResolveWithinAssets(string path)
    {
        var relative = path.Replace('\\', '/').TrimStart('/');
        var fullPath = Path.GetFullPath(Path.Combine(_assetsPath, relative));
        var root = Path.GetFullPath(_assetsPath) + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(root, StringComparison.Ordinal))
            throw new InvalidOperationException(
                $"Mail asset '{path}' must live inside templates/{FolderName}/.");

        return fullPath;
    }

    private static string ContentIdFor(string path)
    {
        var slug = new StringBuilder();
        foreach (var character in path)
            slug.Append(char.IsAsciiLetterOrDigit(character) ? char.ToLowerInvariant(character) : '-');

        var value = slug.ToString().Trim('-');
        return $"{(value.Length == 0 ? "asset" : value)}@{ContentIdDomain}";
    }
}
