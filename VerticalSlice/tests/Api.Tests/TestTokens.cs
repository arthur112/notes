using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Api.Tests;

// Mints real signed JWTs that the API's JwtBearer validates against the key ApiWebFactory
// configures: the full authentication path runs, with no fake auth handler.
public static class TestTokens
{
    public const string Issuer = "api-tests";
    public const string Audience = "vertical-slice-api";
    public static readonly string SigningKey = Convert.ToBase64String(
        "a-32-byte-or-longer-test-signing-key"u8.ToArray()
    );

    public static string Create(string[] scopes, string[] roles) =>
        new JsonWebTokenHandler().CreateToken(
            new SecurityTokenDescriptor
            {
                Issuer = Issuer,
                Audience = Audience,
                Claims = new Dictionary<string, object> { ["scope"] = scopes, ["role"] = roles },
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(Convert.FromBase64String(SigningKey)),
                    SecurityAlgorithms.HmacSha256
                ),
            }
        );
}
