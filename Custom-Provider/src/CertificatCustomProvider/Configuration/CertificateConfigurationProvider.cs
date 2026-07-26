using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace CertificatCustomProvider.Configuration;

/// <summary>
/// Reads a flat JSON file of base64 blobs and decrypts each value with the RSA private key
/// of a certificate (RSA-OAEP-SHA256) found by thumbprint in a certificate store.
/// Keys are case-insensitive.
/// </summary>
public sealed class CertificateConfigurationProvider : ConfigurationProvider
{
    private readonly string _path;
    private readonly string _thumbprint;
    private readonly StoreLocation _storeLocation;
    private readonly StoreName _storeName;

    /// <summary>
    /// Creates a provider reading the encrypted file at <paramref name="path"/>, decrypting
    /// with the certificate identified by <paramref name="thumbprint"/>.
    /// </summary>
    public CertificateConfigurationProvider(
        string path,
        string thumbprint,
        StoreLocation storeLocation = StoreLocation.LocalMachine,
        StoreName storeName = StoreName.My)
    {
        _path = path;
        _thumbprint = thumbprint.Replace(" ", string.Empty, StringComparison.Ordinal);
        _storeLocation = storeLocation;
        _storeName = storeName;
    }

    public override void Load()
    {
        using X509Certificate2 certificate = LoadCertificate();

        using RSA? rsa = certificate.GetRSAPrivateKey();
        if (rsa is null)
        {
            throw new InvalidOperationException(
                $"Certificate '{certificate.Subject}' ({_thumbprint}) has no RSA private key. " +
                $"Check the private key is installed and ACL'd to the app pool identity.");
        }

        Data = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, base64Blob) in EncryptedJsonFile.Read(_path))
        {
            byte[] blob = Convert.FromBase64String(base64Blob);
            byte[] plain = rsa.Decrypt(blob, RSAEncryptionPadding.OaepSHA256);
            Data[key] = Encoding.UTF8.GetString(plain);
        }
    }

    private X509Certificate2 LoadCertificate()
    {
        using var store = new X509Store(_storeName, _storeLocation);
        store.Open(OpenFlags.ReadOnly | OpenFlags.OpenExistingOnly);

        X509Certificate2Collection matches = store.Certificates.Find(
            X509FindType.FindByThumbprint, _thumbprint, validOnly: false);

        if (matches.Count == 0)
        {
            throw new InvalidOperationException(
                $"Certificate with thumbprint '{_thumbprint}' not found in {_storeLocation}\\{_storeName}.");
        }

        return new X509Certificate2(matches[0]);
    }
}
