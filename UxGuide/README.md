# UxGuide

UX best practices for **CRUD pages with dense data** — records of 30–50 fields, where the default
layouts (flat grids, endless forms, overloaded tables) break down — plus a **component-architecture
contract** that keeps every presentational component extractable into a separate Storybook project
without editing a line of component code.

| Document | What it covers |
| --- | --- |
| [`docs/layout-patterns.md`](docs/layout-patterns.md) | Prescriptive layout rules: page anatomy, sectioned dense-data display, tabs-vs-scroll, tables, dense forms, feedback, responsiveness. Each rule points at the demo file that implements it. |
| [`docs/component-architecture.md`](docs/component-architecture.md) | The four-level contract (shadcn primitives / shared dumb / domain dumb / smart), per-level MAY/MAY-NOT lists, the props contract, and the 4-step Storybook extraction checklist. |

| Folder | What it is |
| --- | --- |
| [`demo/`](demo/) | The in-app architecture: both documents implemented against a 42-field `Product` record — list, detail, create/edit, delete, all client-side (in-memory fake API — reload resets the data). |
| [`library/`](library/) | The extraction result: a working Storybook 10 prototype of a company component library (`@company/ui`), built by copying the demo's dumb components unedited and adding colocated stories. |

## Running

The demo app:

```bash
cd demo
bun install
bun run dev        # http://localhost:5173
```

`bun run build` type-checks (`tsc --noEmit`) and produces a production bundle.

The component library (Storybook):

```bash
cd library
bun install
bun run dev        # http://localhost:6006
```

`bun run build` produces a static Storybook; see [`library/README.md`](library/README.md) for how
other projects consume the package.

## What to look at

| Rule from the guide | Demo file |
| --- | --- |
| Page anatomy: one primary action; destructive actions in a menu | `demo/src/components/PageHeader.tsx`, `demo/src/features/products/ProductDetailPage.tsx` |
| Dense read display: key-facts strip + six titled sections, metadata last and muted | `demo/src/features/products/components/ProductDetail.tsx` |
| Label-over-value responsive grid (1/2/3 columns) | `demo/src/components/DetailGrid.tsx`, `demo/src/components/DetailField.tsx` |
| Table: 7 default columns, column-visibility menu, sorting, sticky header, pagination 25/50/100, skeleton/empty/error states | `demo/src/features/products/components/ProductTable.tsx` |
| Form: same sections as read view, required markers, blur validation, sticky action bar | `demo/src/features/products/components/ProductForm.tsx` |
| Error summary linking to fields on failed submit | `demo/src/components/ErrorSummary.tsx` |
| Dirty-form navigation guard; delete behind a confirm dialog | `demo/src/features/products/ProductFormPage.tsx`, `demo/src/components/ConfirmDialog.tsx` |
| Toasts on every mutation | the three smart pages in `demo/src/features/products/` |

## Verifying the architecture contract

The dumb layers must stay free of routing and data fetching — that's what makes them
Storybook-extractable. Check:

```bash
grep -rn "useNavigate\|useParams\|fetch(" demo/src/components/ demo/src/features/products/components/
# → no matches
```

## Stack

React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui (radix-nova preset), TanStack Router
(code-based routes), TanStack Table v9 (via its v8-compatibility `legacy` entry point),
react-hook-form + zod, sonner, Storybook 10 (`library/`). Package manager: bun.
