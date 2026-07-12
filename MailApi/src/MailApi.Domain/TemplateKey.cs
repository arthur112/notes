using System.Text.RegularExpressions;

namespace MailApi.Domain;

public sealed partial class TemplateKey
{
    private static readonly Regex ValidPattern = TemplateKeyPattern();

    private TemplateKey(string value) => Value = value;

    public string Value { get; }

    public static bool TryCreate(string? value, out TemplateKey? templateKey)
    {
        if (!string.IsNullOrWhiteSpace(value) && ValidPattern.IsMatch(value))
        {
            templateKey = new TemplateKey(value);
            return true;
        }

        templateKey = null;
        return false;
    }

    public override string ToString() => Value;

    [GeneratedRegex("^[A-Za-z0-9_-]+$")]
    private static partial Regex TemplateKeyPattern();
}
