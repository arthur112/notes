# @company/ui — component library (Storybook POC)

A working prototype of the **company component library**: the presentational components from
[`../demo/`](../demo/) extracted into a standalone package with Storybook as the showcase, per the
contract in [`../docs/component-architecture.md`](../docs/component-architecture.md). Every
component here was copied byte-identical from the demo — no component code was edited, which is the
point of the architecture contract.

- `src/components/ui/` — shadcn primitives (level 1)
- `src/components/` — the reusable core: `PageHeader`, `FormSection`, `DetailGrid`, `DetailField`,
  `ErrorSummary`, `ConfirmDialog` (level 2)
- `src/features/products/` — reference pattern (level 3): `ProductTable`, `ProductDetail`,
  `ProductForm`, plus `types.ts` and `fixtures.ts`. Domain components are included to demonstrate
  the full extraction; the generic `Components/` set is the reusable core.

## Running

```bash
cd library
bun install
bun run dev        # Storybook at http://localhost:6006
```

`bun run build` produces a static Storybook in `storybook-static/`; `bun run typecheck` runs
`tsc --noEmit` (the stories type-check against each component's exported `<Name>Props`).

## Consuming from another project

The package exports source (no build step) — the boring option for an internal library whose
consumers all run Vite/bundlers:

```bash
bun add file:../path/to/library    # or publish @company/ui to your registry
```

```ts
// app entry
import '@company/ui/styles.css'

// components — subpath exports point straight at files, no barrels
import { PageHeader } from '@company/ui/components/PageHeader'
import { Button } from '@company/ui/ui/button'
import { ProductTable } from '@company/ui/products/ProductTable'
import type { Product } from '@company/ui/products/types'
```

Components import each other via the `@/` alias (kept so library files stay identical to the app
they were extracted from), so the consuming project must map it too:

```ts
// vite.config.ts
resolve: { alias: { '@': path.resolve(__dirname, 'node_modules/@company/ui/src') } }
// tsconfig.json
"paths": { "@/*": ["./node_modules/@company/ui/src/*"] }
```

Production hardening — a real build step (Vite library mode + emitted `.d.ts`) so consumers need no
alias — is future work, intentionally out of scope for this POC.

## Stack

Storybook 10 (`@storybook/react-vite`), React 19, Tailwind CSS v4, shadcn/ui (radix-nova preset),
TanStack Table v9 (legacy entry), react-hook-form + zod. Package manager: bun.
