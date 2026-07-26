using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace CertificatCustomProvider.Configuration;

/// <summary>
/// Reads a flat JSON file of base64 DPAPI blobs and decrypts each value with
/// <see cref="ProtectedData.Unprotect"/> (<see cref="DataProtectionScope.LocalMachine"/>).
/// Windows-only; keys are case-insensitive.
/// </summary>
public sealed class DpapiConfigurationProvider : ConfigurationProvider
{
    private readonly string _path;

    /// <summary>Creates a provider reading the encrypted file at <paramref name="path"/>.</summary>
    public DpapiConfigurationProvider(string path)
    {
        _path = path;
    }

    public override void Load()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            throw new PlatformNotSupportedException(
                "DPAPI configuration is only supported on Windows. " +
                "Use User Secrets or another provider outside Production.");
        }

        Data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, base64Blob) in EncryptedJsonFile.Read(_path))
        {
            byte[] blob = Convert.FromBase64String(base64Blob);
            byte[] plain = ProtectedData.Unprotect(blob, optionalEntropy: null, DataProtectionScope.LocalMachine);
            Data[key] = Encoding.UTF8.GetString(plain);
        }
    }
}

internal static class EncryptedJsonFile
{
    public static IEnumerable<KeyValuePair<string, string>> Read(string path)
    {
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Encrypted secrets file not found: {path}", path);
        }

        using var stream = File.OpenRead(path);
        using var doc = JsonDocument.Parse(stream);

        if (doc.RootElement.ValueKind != JsonValueKind.Object)
        {
            throw new FormatException($"Encrypted secrets file must be a flat JSON object: {path}");
        }

        foreach (var property in doc.RootElement.EnumerateObject())
        {
            if (property.Value.ValueKind != JsonValueKind.String)
            {
                throw new FormatException(
                    $"Value for '{property.Name}' must be a base64 string: {path}");
            }

            yield return new KeyValuePair<string, string>(property.Name, property.Value.GetString()!);
        }
    }
}
