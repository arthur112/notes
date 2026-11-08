using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

namespace Api.Auth;

// A real identity provider's authorization-code endpoints and the public client Scalar logs in
// with (Auth:OAuth:*). Unset locally: Scalar then only offers the Bearer scheme, where a
// `dotnet user-jwts` token is pasted.
internal sealed record OAuthSettings(Uri AuthorizationUrl, Uri TokenUrl, string ClientId)
{
    public static OAuthSettings? From(IConfiguration config) =>
        config["Auth:OAuth:ClientId"] is { } clientId
            ? new(
                new Uri(config["Auth:OAuth:AuthorizationUrl"]!),
                new Uri(config["Auth:OAuth:TokenUrl"]!),
                clientId
            )
            : null;
}

// Declares how to authenticate in the OpenAPI document, so Scalar shows an Auth panel.
internal sealed class SecuritySchemeTransformer(IConfiguration config) : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken
    )
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Security ??= [];

        Add(
            "Bearer",
            new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
            }
        );

        if (OAuthSettings.From(config) is { } oauth)
            Add(
                "OAuth2",
                new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.OAuth2,
                    Flows = new OpenApiOAuthFlows
                    {
                        AuthorizationCode = new OpenApiOAuthFlow
                        {
                            AuthorizationUrl = oauth.AuthorizationUrl,
                            TokenUrl = oauth.TokenUrl,
                            Scopes = Scopes.All,
                        },
                    },
                }
            );

        return Task.CompletedTask;

        // Each scheme is its own requirement: either one authenticates a request.
        void Add(string name, OpenApiSecurityScheme scheme)
        {
            document.Components.SecuritySchemes[name] = scheme;
            document.Security.Add(
                new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference(name, document)] = [] }
            );
        }
    }
}

internal static class ScalarAuthExtensions
{
    // With an identity provider configured, Scalar's Authorize button runs an authorization-code
    // + PKCE login and requests every scope; otherwise it prefills nothing and asks for a
    // Bearer token.
    public static ScalarOptions WithOAuthLogin(this ScalarOptions options, IConfiguration config) =>
        OAuthSettings.From(config) is { } oauth
            ? options
                .AddPreferredSecuritySchemes(["OAuth2"])
                .AddAuthorizationCodeFlow(
                    "OAuth2",
                    flow =>
                    {
                        flow.ClientId = oauth.ClientId;
                        flow.Pkce = Pkce.Sha256;
                        flow.SelectedScopes = [.. Scopes.All.Keys];
                    }
                )
            : options.AddPreferredSecuritySchemes(["Bearer"]);
}
