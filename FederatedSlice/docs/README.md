# Docs

How the main technical pieces of FederatedSlice work, from the browser to SQL Server. Each doc follows one feature across both sides: `web/` (the shell) and `src/Api` (the back end).

| Doc | Covers | Status |
| --- | --- | --- |
| [Filtering](filtering.md) | Filtered lists: the filter definition, the URL as the only filter state, the Gridify query, the API's mapper and the SQL it becomes | Implemented |
| [Forms](forms.md) | The order form: raw values vs. payload, the four validation layers, server errors on fields, create/edit, read-only without the role, unsaved-changes guard | Implemented |
| [Write rules](rules.md) | One create/update path: 1:1 mapper, named rules (OnCreate / OnChange / Always) that silently override columns, per-customer settings, the order they run in | Implemented |
| [OIDC](oidc.md) | Keycloak sign-in in the shell (PKCE), scopes and roles on the API, `dotnet user-jwts`, Scalar login, test tokens | Implemented |
| [API contract](api-contract.md) | A complete OpenAPI document (`TypedResults` signatures, unique schema names, strict numbers); notes on generating the front's types from it, in one repo or across separate repos | Step 1 implemented, steps 2–3 planned |

Paths in these docs are relative to the note's root (`FederatedSlice/`). The root [README](../README.md) has the overview, the contract table and how to run the project.
