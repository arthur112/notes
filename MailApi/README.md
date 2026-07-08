# MailApi note

A minimal centralised **mail API** for a closed environment, plus a thin **SDK** other apps use to send standardised mail. This implements **Proposition A** from [`DESIGN.md`](DESIGN.md): file-based Liquid templates, a single endpoint, no database.

Templates are written in **HTML + inline CSS + Liquid** and rendered with [Fluid.Core](https://github.com/sebastienros/fluid); the rendered MIME is delivered via [MailKit](https://github.com/jstedfast/MailKit). **No CSS inliner** — templates already carry inline styles, per the design.

## What the API does (and nothing more)

1. Holds SMTP + template-location config.
2. `POST /api/mail/send` — render the named template with the supplied `data` and send it.
3. Optionally gate the endpoint behind an `X-Api-Key` shared secret.

## Layout

```
MailApi/
├── DESIGN.md                      # design propositions (A/B/C) + cross-cutting notes
├── MailApi.slnx
└── src/
    ├── MailApi/                   # the ASP.NET Core minimal API
    │   ├── Program.cs             # single endpoint: auth → validate → render → SMTP
    │   ├── TemplateRenderer.cs    # Fluid parse (cached) + render
    │   ├── SendMailRequest.cs     # request DTO + JSON→Liquid model converter
    │   ├── MailOptions.cs         # SmtpOptions / MailApiOptions
    │   ├── appsettings.json       # Smtp + MailApi config
    │   └── templates/             # one folder, file-based templates
    │       ├── welcome.liquid                # HTML body (inline CSS, Liquid)
    │       ├── welcome.subject.liquid        # subject line
    │       ├── welcome.text.liquid           # plain-text alternative
    │       ├── reset-password.liquid
    │       ├── reset-password.subject.liquid
    │       └── reset-password.text.liquid
    └── MailApi.Sdk/               # client library consumed by other apps
        ├── MailClient.cs          # SendAsync(...) → returns messageId
        ├── SendMailRequest.cs     # SDK-side request DTO
        ├── MailClientOptions.cs   # BaseUrl / ApiKey / Timeout
        └── ServiceCollectionExtensions.cs  # AddMailClient(...)
```

## Template convention

Each mail type is a set of files keyed by name in `templates/`. Only the body is required:

| File | Required | Purpose |
| --- | --- | --- |
| `{key}.liquid` | yes | HTML body (inline CSS, Liquid) |
| `{key}.subject.liquid` | no | subject line; falls back to the request's `subject`, then `(no subject)` |
| `{key}.text.liquid` | no | plain-text alternative (multipart `text/plain`) |

The `data` object becomes the **root** Liquid model, so reference fields directly: `{{ name }}`, `{{ user.email }}`, `{{ items[0].id }}`. Keys are case-insensitive.

## Run it

You need an SMTP relay to actually deliver. Anything works locally — [smtp4dev](https://github.com/rnwood/smtp4dev), MailHog, Papercut, etc. Point `Smtp` in `appsettings.json` at it (defaults to `localhost:1025`).

```bash
cd MailApi
dotnet build
dotnet run --project src/MailApi     # listens on http://localhost:5255
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

To change copy/HTML, edit the `.liquid` files on disk — the renderer re-reads them on change, **no redeploy**.

## Configuration (`appsettings.json`)

```jsonc
"Smtp": {
  "Host": "localhost",
  "Port": 1025,
  "UseSsl": false,
  "Username": null,
  "Password": null,
  "From": { "Name": "System", "Address": "no-reply@example.com" }
},
"MailApi": {
  "TemplatesPath": "templates",   // relative to ContentRootPath unless rooted
  "ApiKey": null                  // set to a secret to require X-Api-Key; null disables auth
}
```

Any value can be overridden via environment variables using `__` (e.g. `Smtp__Port`, `MailApi__ApiKey`).

## API contract

```
POST /api/mail/send
Header: X-Api-Key: <secret>      (only if MailApi:ApiKey is set)

{
  "template": "welcome",         // key in templates/; [A-Za-z0-9_-] only (path-traversal safe)
  "to":      ["user@example.com"],
  "cc":      ["other@example.com"],   // optional
  "subject": "Override",              // optional; overrides {key}.subject.liquid
  "data":    { ... Liquid model ... }
}
```

| Status | Meaning |
| --- | --- |
| `200` | sent — returns `{ "messageId": "..." }` |
| `400` | bad request (missing fields, unknown template, bad template key, Liquid parse error) |
| `401` | missing/wrong `X-Api-Key` |
| `502` | SMTP failure (relay down / rejected) |

## Using the SDK

Reference `MailApi.Sdk` and register the client:

```csharp
builder.Services.AddMailClient(builder.Configuration.GetSection("MailClient"));
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

1. The endpoint checks the API key (if configured) and validates the request + template key (regex guard blocks `../`).
2. `DataConverter` turns the JSON `data` into a case-insensitive dictionary tree Fluid can read.
3. `TemplateRenderer` reads each `.liquid` file, parses it with `FluidParser` (cached by path + last-write-time, so edits are picked up automatically) and renders it against the model.
4. The rendered HTML (+ optional plain text) is assembled into a `MimeMessage` and sent through MailKit over SMTP.
