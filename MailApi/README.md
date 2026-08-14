# MailApi note

A minimal centralised **mail API** for a closed environment, plus a thin **SDK** other apps use to send standardised mail. This implements **Proposition A** from [`DESIGN.md`](DESIGN.md): file-based Liquid templates, a single endpoint, no database.

Templates are written in **HTML + inline CSS + Liquid** and rendered with [Fluid.Core](https://github.com/sebastienros/fluid); the rendered MIME is delivered via [MailKit](https://github.com/jstedfast/MailKit). **No CSS inliner** — templates already carry inline styles, per the design.

## What the API does (and nothing more)

1. Holds SMTP + API-key config.
2. `POST /api/mail/send` — render the named template with the supplied `data` and send it.
3. Optionally gate the endpoint behind an `X-Api-Key` shared secret.

## Layout

```
MailApi/
├── DESIGN.md                      # design propositions (A/B/C) + cross-cutting notes
├── MailApi.slnx
├── src/
│   ├── MailApi.Domain/            # MailTemplate enum + OutboundEmail; no external dependencies
│   ├── MailApi.Application/       # send-mail use case + template/sender abstractions
│   ├── MailApi.Infrastructure/    # Fluid, MailKit, SMTP config, and source templates
│   │   └── templates/             # copied into Web build and publish output
│   │       ├── _header.liquid                # shared HTML header (logo, opens the card)
│   │       ├── _footer.liquid                # shared HTML footer (sign-off, closes the card)
│   │       ├── welcome.liquid                # HTML body only (inline CSS, Liquid)
│   │       └── reset-password.liquid
│   ├── MailApi.Web/               # minimal HTTP API and composition root
│   │   ├── Program.cs             # auth → HTTP mapping → send-mail use case
│   │   └── appsettings.json       # Smtp + MailApi config
│   └── MailApi.Sdk/               # client library consumed by other apps
│       ├── MailClient.cs          # SendAsync(...) → returns messageId
│       ├── SendMailRequest.cs     # SDK-side request DTO
│       ├── MailClientOptions.cs   # BaseUrl / ApiKey / Timeout
│       └── ServiceCollectionExtensions.cs  # AddMailClient(...)
└── tests/
    ├── MailApi.Application.Tests/
    └── MailApi.Web.Tests/
```

## Template convention

Mail types are a closed set: the `MailTemplate` enum (`Welcome`, `ResetPassword`) selects the body file by name (`welcome.liquid`, `reset-password.liquid`) and defines the default subject in C#. Source templates live in `MailApi.Infrastructure`; the Web project copies them into `bin/.../templates/` and publish output. The renderer always reads from `AppContext.BaseDirectory/templates`.

| File | Purpose |
| --- | --- |
| `_header.liquid` / `_footer.liquid` | shared HTML chrome wrapped around every body — logo + card wrapper, sign-off + closing markup |
| `{file-name}.liquid` | HTML body for one `MailTemplate` value (inline CSS, Liquid) |

Every mail is rendered as `_header` + body + `_footer` into a single HTML document, so a template only carries its body — pick the `MailTemplate` value and you pick the body. The shared parts receive the same `data` model; the header/footer use `{{ brand | default: "MailApi" }}`, so pass `brand` in `data` to override the wordmark. A missing or unreadable template file is a server error (`500`), not a `400`.

The `data` object becomes the **root** Liquid model, so reference fields directly: `{{ name }}`, `{{ user.email }}`, `{{ items[0].id }}`. Keys are case-insensitive.

## Run it

You need an SMTP relay to actually deliver. Anything works locally — [smtp4dev](https://github.com/rnwood/smtp4dev), MailHog, Papercut, etc. Point `Smtp` in `appsettings.json` at it (defaults to `localhost:1025`).

```bash
cd MailApi
dotnet build
dotnet run --project src/MailApi.Web # listens on http://localhost:5255
```

Send a mail (auth disabled by default):

```bash
curl -X POST http://localhost:5255/api/mail/send \
  -H "Content-Type: application/json" \
  -d '{
        "template": "welcome",
        "to": ["ada@example.com"],
        "data": { "name": "Ada", "actionUrl": "https://app.example.com/verify?token=abc" }
      }'
# -> {"messageId":"..."}
```

To change copy/HTML without restarting, edit the deployed `templates/` directory next to the running binary — files are read fresh on every send. Source-template edits are copied into `bin/.../templates/` by the next build or `dotnet watch` update.

## Configuration (`appsettings.json`)

```jsonc
"Smtp": {
  "Host": "localhost",
  "Port": 1025,
  "Security": "None",            // None, Auto, StartTls, StartTlsWhenAvailable, or SslOnConnect
  "Username": null,
  "Password": null,
  "From": { "Name": "System", "Address": "no-reply@example.com" }
},
"MailApi": {
  "ApiKey": null                  // set to a secret to require X-Api-Key; null disables auth
}
```

Any value can be overridden via environment variables using `__` (e.g. `Smtp__Port`, `MailApi__ApiKey`).

## API contract

```
POST /api/mail/send
Header: X-Api-Key: <secret>      (only if MailApi:ApiKey is set)

{
  "template": "welcome",         // MailTemplate value (name or file name, case-insensitive)
  "to":      ["user@example.com"],
  "cc":      ["other@example.com"],   // optional
  "subject": "Override",              // optional; overrides the template's default subject
  "data":    { ... Liquid model ... }
}
```

| Status | Meaning |
| --- | --- |
| `200` | sent — returns `{ "messageId": "..." }` |
| `400` | bad request (missing fields, invalid address/data, unknown template) |
| `401` | missing/wrong `X-Api-Key` |
| `500` | a deployed template is invalid or could not be read from disk |
| `502` | SMTP failure (relay down / rejected) |

## Using the SDK

Reference `MailApi.Sdk` and register the client:

```csharp
builder.Services.AddMailClient(builder.Configuration);
// appsettings:  "MailClient": { "BaseUrl": "http://mail-api.internal/", "ApiKey": "secret" }
```

Then send:

```csharp
public class WelcomeService(MailApi.Sdk.MailClient mail)
{
    public Task<string> SendWelcomeAsync(string email, string name, string actionUrl) =>
        mail.SendAsync("welcome", [email], new { name, actionUrl });
}
```

`MailClient.SendAsync` returns the server's `messageId`, or throws `MailApiException` (carrying `StatusCode` + body) on a non-2xx response.

## How it works

1. Web validates the API key, maps the HTTP DTO, and converts JSON `data` into a case-insensitive dictionary tree.
2. Application validates the command, resolves `template` to a `MailTemplate` enum value, picks the request or template default subject, and coordinates rendering and delivery through `CSharpFunctionalExtensions.Result<T, MailError>`.
3. Infrastructure reads `AppContext.BaseDirectory/templates`, renders `_header` + body + `_footer` with Fluid (HTML-encoded output), then constructs and sends the MIME message through MailKit.
4. Domain contains the transport-independent `MailTemplate` and `OutboundEmail` models.
