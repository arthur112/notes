# Docs

How the main technical pieces of FederatedSlice work, from the browser to SQL Server. Each doc follows one feature across both sides: `web/` (the shell) and `src/Api` (the back end).

| Doc | Covers | Status |
| --- | --- | --- |
| [Filtering](filtering.md) | Filtered lists: the filter definition, the URL as the only filter state, the Gridify query, the API's mapper and the SQL it becomes | Implemented |
| [Forms](forms.md) | The order form: raw values vs. payload, the four validation layers, server errors on fields, create/edit, unsaved-changes guard | Implemented |
| [OIDC](oidc.md) | Signing in to the shell and protecting the API with scopes and roles | **Design only, not implemented** |

Paths in these docs are relative to the note's root (`FederatedSlice/`). The root [README](../README.md) has the overview, the contract table and how to run the project.
