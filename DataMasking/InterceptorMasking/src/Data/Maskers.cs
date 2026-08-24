namespace InterceptorMasking.Data;

public static class Maskers
{
    public static object? Apply(MaskKind kind, object? value) => (kind, value) switch
    {
        (_, null) => null,
        (MaskKind.Email, string s) => MaskEmail(s),
        (MaskKind.Phone, string s) => MaskPartial(s, keepFirst: 1, keepLast: 2),
        (MaskKind.Zero, decimal) => 0m,
        (MaskKind.Iban, string s) => MaskIban(s),
        (MaskKind.Default, string) => "***",
        _ => "***"
    };

    // BE68539007547034 -> BE**************34
    private static string MaskIban(string iban)
    {
        if (iban.Length <= 6) return new string('*', iban.Length);
        return $"{iban[..2]}{new string('*', iban.Length - 6)}{iban[^4..]}";
    }

    // ada.lovelace@contoso.com -> a***@***.com
    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at < 1) return "***";
        var tld = email[(email.LastIndexOf('.') is var dot && dot > at ? dot : email.Length)..];
        return $"{email[0]}***@***{tld}";
    }

    // 5551234567 -> 5XX-XX67
    private static string MaskPartial(string s, int keepFirst, int keepLast)
    {
        if (s.Length <= keepFirst + keepLast) return new string('X', s.Length);
        return $"{s[..keepFirst]}XX-XX{s[^keepLast..]}";
    }
}
