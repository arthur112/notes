using Microsoft.Extensions.Configuration;

namespace CertificatCustomProvider.Configuration;

/// <summary>Registration extensions for the encrypted-file configuration providers.</summary>
public static class EncryptedFileConfigurationExtensions
{
    /// <summary>
    /// Adds a DPAPI-encrypted flat JSON file. Values must have been encrypted with
    /// ProtectedData.Protect (LocalMachine scope) on this machine.
    /// Windows-only.
    /// </summary>
    public static IConfigurationBuilder AddDpapiFile(this IConfigurationBuilder builder, string path) =>
        builder.Add(new DpapiConfigurationSource { Path = path });

    /// <summary>
    /// Adds a certificate-encrypted flat JSON file. Values must have been encrypted with the
    /// public key of the certificate identified by <paramref name="thumbprint"/> using
    /// RSA-OAEP-SHA256. The certificate (with private key) must be in LocalMachine\My,
    /// ACL'd to the app pool identity.
    /// </summary>
    public static IConfigurationBuilder AddCertificateFile(
        this IConfigurationBuilder builder, string path, string thumbprint) =>
        builder.Add(new CertificateConfigurationSource { Path = path, Thumbprint = thumbprint });
}
