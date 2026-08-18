# MailApi note

A minimal centralised **mail API** for a closed environment, plus a thin **SDK** other apps use to send standardised mail. This implements **Proposition A** from [`DESIGN.md`](DESIGN.md): file-based Liquid templates, a single endpoint, no database.

Templates are written in **HTML + inline CSS + Liquid** and rendered with [Fluid.Core](https://github.com/sebastienros/fluid); the rendered MIME is delivered via [MailKit](https://github.com/jstedfast/MailKit). **No CSS inliner** — templates already carry inline styles, per the design.

## What the API does (and nothing more)

1. Holds SMTP + API-key config.
2. `POST /api/mail/send` — render the named template with the supplied `data` and send it.
3. `POST /api/mail/evaluate` — render the named template and return the HTML without sending (dry run).
4. Optionally gate the endpoints behind an `X-Api-Key` shared secret.

## Layout

```
MailApi/
├── DESIGN.md                      # design propositions (A/B/C) + cross-cutting notes
├── MailApi.slnx
├── src/
│   ├── MailApi.Domain/            # MailTemplate enum + OutboundEmail; no external dependencies
│   ├── MailApi.Application/       # send-mail + evaluate (dry-run render) use cases, template/sender abstractions
│   ├── MailApi.Infrastructure/    # Fluid, MailKit, SMTP config, and source templates
│   │   └── templates/             # copied into Web build and publish output
│   │       ├── _layout.liquid                # shared HTML chrome (header, {% renderbody %}, footer)
│   │       ├── welcome.liquid                # HTML body (inline CSS, Liquid) wrapped in {% layout '_layout' %}
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
| `_layout.liquid` | shared HTML chrome around every body — brand header, `{% renderbody %}` placeholder, sign-off footer |
| `{file-name}.liquid` | HTML body for one `MailTemplate` value (inline CSS, Liquid); declares `{% layout '_layout' %}` on its first line |

Every mail is rendered through a custom `{% layout %}` / `{% renderbody %}` tag pair registered on the `FluidParser` — the same pattern Fluid itself documents and uses in its `Fluid.ViewEngine` (`FluidViewParser`). The `layout` tag is an *expression tag* that only records the layout path in the render context; after the body is rendered, the renderer loads the layout file and renders it with the body available to `{% renderbody %}` (an *empty tag* that writes the already-encoded body verbatim). A template still only carries its body — the `{% layout %}` line just names the surrounding chrome. The layout receives the same `data` model; it uses `{{ brand | default: "MailApi" }}`, so pass `brand` in `data` to override the wordmark. A missing or unreadable template file is a server error (`500`), not a `400`.

The `data` object becomes the **root** Liquid model, so reference fields directly: `{{ name }}`, `{{ user.email }}`, `{{ items[0].id }}`. Keys are case-insensitive.

## Run it

You need an SMTP relay to actually deliver. Anything works locally — [smtp4dev](https://github.com/rnwood/smtp4dev), MailHog, Papercut, etc. Point `Smtp` in `appsettings.json` at it (defaults to `localhost:1025`).

```bash
cd MailApi
dotnet build
dotnet run --project src/MailApi.Web # listens on http://localhost:5255
```

### Test it in the browser

The API publishes an OpenAPI document (`/openapi/v1.json`) and a [Scalar](https://scalar.com/) UI at **http://localhost:5255/scalar/v1** where you can fire requests directly — set the `X-Api-Key` auth value once if `MailApi:ApiKey` is configured.

The `/api/mail/evaluate` endpoint renders a template and returns the HTML (`text/html`) **without sending** — no SMTP relay needed, ideal for template iteration:

```bash
curl -X POST http://localhost:5255/api/mail/evaluate \
  -H "Content-Type: application/json" \
  -d '{ "template": "welcome", "data": { "name": "Ada", "actionUrl": "https://app.example.com/verify?token=abc" } }'
# -> 200 text/html — the rendered mail, layout included
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

POST /api/mail/evaluate
Header: X-Api-Key: <secret>      (only if MailApi:ApiKey is set)

{
  "template": "welcome",         // same template values as /send
  "data":    { ... Liquid model ... }
}
```

| Status | Meaning |
| --- | --- |
| `200` | `/send`: sent — returns `{ "messageId": "..." }`; `/evaluate`: rendered — returns the HTML as `text/html` |
| `400` | bad request (missing fields, invalid address/data, unknown template) |
| `401` | missing/wrong `X-Api-Key` |
| `500` | a deployed template is invalid or could not be read from disk |
| `502` | SMTP failure (relay down / rejected) — `/send` only |

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
3. Infrastructure reads `AppContext.BaseDirectory/templates`, renders the body with Fluid (HTML-encoded output) and wraps it into the `_layout.liquid` the body names via the custom `{% layout %}` tag, then constructs and sends the MIME message through MailKit.
4. Domain contains the transport-independent `MailTemplate` and `OutboundEmail` models.
