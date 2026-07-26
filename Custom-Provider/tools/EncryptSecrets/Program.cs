using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;

if (args.Length < 3)
{
    Console.Error.WriteLine("Usage:");
    Console.Error.WriteLine("  EncryptSecrets dpapi <input plain json> <output encrypted json>");
    Console.Error.WriteLine("  EncryptSecrets cert <input plain json> <output encrypted json> <thumbprint>");
    return 1;
}

string mode = args[0].ToLowerInvariant();
string inputPath = args[1];
string outputPath = args[2];

Dictionary<string, string> plain = ReadFlatJson(inputPath);
var encrypted = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

switch (mode)
{
    case "dpapi":
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            Console.Error.WriteLine("DPAPI mode is Windows-only. Run this tool on the target IIS server.");
            return 2;
        }

        foreach (var (key, value) in plain)
        {
            byte[] blob = ProtectedData.Protect(
                Encoding.UTF8.GetBytes(value), optionalEntropy: null, DataProtectionScope.LocalMachine);
            encrypted[key] = Convert.ToBase64String(blob);
        }
        break;

    case "cert":
        if (args.Length < 4)
        {
            Console.Error.WriteLine("cert mode requires a certificate thumbprint.");
            return 1;
        }

        using (X509Certificate2 certificate = FindCertificate(args[3]))
        using (RSA rsa = certificate.GetRSAPublicKey()
               ?? throw new InvalidOperationException("Certificate has no RSA public key."))
        {
            foreach (var (key, value) in plain)
            {
                byte[] blob = rsa.Encrypt(Encoding.UTF8.GetBytes(value), RSAEncryptionPadding.OaepSHA256);
                encrypted[key] = Convert.ToBase64String(blob);
            }
        }
        break;

    default:
        Console.Error.WriteLine($"Unknown mode '{args[0]}'. Use 'dpapi' or 'cert'.");
        return 1;
}

var json = JsonSerializer.Serialize(encrypted, new JsonSerializerOptions { WriteIndented = true });
File.WriteAllText(outputPath, json);
Console.WriteLine($"Encrypted {encrypted.Count} value(s) -> {outputPath}");
Console.WriteLine("Delete the plain input file now.");
return 0;

static Dictionary<string, string> ReadFlatJson(string path)
{
    if (!File.Exists(path))
    {
        throw new FileNotFoundException($"Input file not found: {path}", path);
    }

    using var stream = File.OpenRead(path);
    using var doc = JsonDocument.Parse(stream);

    if (doc.RootElement.ValueKind != JsonValueKind.Object)
    {
        throw new FormatException("Input must be a flat JSON object: { \"Some:Key\": \"value\", ... }");
    }

    var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    foreach (var property in doc.RootElement.EnumerateObject())
    {
        if (property.Value.ValueKind != JsonValueKind.String)
        {
            throw new FormatException($"Value for '{property.Name}' must be a string.");
        }

        result[property.Name] = property.Value.GetString()!;
    }

    return result;
}

static X509Certificate2 FindCertificate(string thumbprint)
{
    string normalized = thumbprint.Replace(" ", string.Empty, StringComparison.Ordinal);

    foreach (StoreLocation location in new[] { StoreLocation.LocalMachine, StoreLocation.CurrentUser })
    {
        try
        {
            using var store = new X509Store(StoreName.My, location);
            store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);

            X509Certificate2Collection matches = store.Certificates.Find(
                X509FindType.FindByThumbprint, normalized, validOnly: false);

            if (matches.Count > 0)
            {
                return new X509Certificate2(matches[0]);
            }
        }
        catch (PlatformNotSupportedException)
        {
        }
        catch (CryptographicException)
        {
        }
    }

    throw new InvalidOperationException(
        $"Certificate with thumbprint '{normalized}' not found in LocalMachine\\My or CurrentUser\\My.");
}
