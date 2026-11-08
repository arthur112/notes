# Forms

The order form (create at `/app1/orders/new`, edit at `/<app>/orders/$orderNo`) is the project's one form. Its pieces are generic, so the next form reuses the kit and copies the shape:

| Piece | File | Role |
| --- | --- | --- |
| Form kit | `web/src/shared/components/form/` | `useAppForm` / `withForm` (TanStack Form `createFormHook`), field components (`TextField`, `NumberField`, `SelectField`, `DateField`), `SubmitButton`, `submitTo` |
| Options | `web/src/domains/orders/order-form/order-form-options.ts` | Form values, the Zod schema, defaults, `toFormValues`, `saveOrder` |
| Data | `…/order-form/use-order-form-data.ts` | Everything the form reads from or writes to the server |
| Form | `…/order-form/order-form.tsx`, `order-lines.tsx` | Rendering only |
| Pages | `…/order-form/order-pages.tsx` | `NewOrder` / `EditOrder`, with the app passing `onDone` |
| API | `src/Api/Features/Orders/` | `OrderInput` (attributes), `OrderWrite` + `OrderRules` (the write path, see [Write rules](rules.md)), `CreateOrder` / `UpdateOrder` |

## Raw values in, payload out

The controls hold what the user typed, not the API's types:

```ts
type OrderFormValues = {
  orderNo: string | null;        // null = create; not a control, it picks the endpoint
  customer: string | null;       // null = not picked yet
  status: OrderStatus;
  dueDate: string | null;        // YYYY-MM-DD
  reference: string;
  lines: { product: string; quantity: string; unitPrice: string }[]; // "10,5" survives as typed
};
```

`orderFormSchema` (Zod) does two jobs at once. It **validates** these raw values and **transforms** them into the API payload: `"10,5"` becomes `10.5`, a blank reference becomes `undefined`, and the output type is `OrderInput`. So there is no separate mapping step. The save calls `schema.parse(value)` and sends the result.

## Four validation layers

| # | Where | When | Example | Shows |
| --- | --- | --- | --- | --- |
| 1 | `orderFormSchema`, run as `validators.onDynamic` with `revalidateLogic()` | Quiet until the first submit, then on every change | "Pick a customer", "Whole units", "Add at least one line" | Under the field, cleared as you fix it |
| 2 | `reference` field's `onChangeAsync`, debounced 400 ms | While typing | "Already used on another order" (`GET /api/orders/reference-taken?reference=…&exceptOrderNo=…`) | Under the field, "Checking…" meanwhile |
| 3 | .NET 10 built-in validation on `OrderInput` / `OrderLine` attributes | Before the handler runs | `[Range(1, …)] Quantity`, `[MaxLength(50)] Reference` | `400` with `errors`, mapped to fields |
| 4 | `OrderWrite.ApplyAsync` | In the handler, with the database | Unknown customer, "Umbrella is on credit hold.", reference taken | `400` with `errors`, mapped to fields |

Layers 1 and 2 are for the user's convenience. Layers 3 and 4 are the authority, since a client check is only a hint (another tab may take the reference in between). The credit hold only exists in layer 4, because only the database knows it (`customers.is_on_hold`).

After layer 4 passes, the write rules can still **change** values without an error: a prepaid customer's order is saved as Paid, and a contract customer's due date is recomputed ([Write rules](rules.md)). The form doesn't show those changes when it saves, but reopening the order does. The Customers list shows each customer's settings.

The client and server rules are written twice, in Zod and in C# attributes. Keep them in sync by hand:

| Rule | Zod (`orderFormSchema`) | C# (`OrderInput.cs`) |
| --- | --- | --- |
| Customer picked | `z.string({ error: "Pick a customer" })` | `[Required]`, plus *exists* and *not on credit hold* (`OrderWrite`) |
| Status | `z.enum(STATUSES)` | `OrderStatus` enum. An unknown name fails JSON reading: a `400` with no `errors`, shown as a form-level message. On create, overwritten by the customer's `initial_status` when set (a rule). |
| Due date | `z.string({ error: "Pick a due date" })` | `[Required] DateOnly?`: nullable so that a missing value fails instead of binding as `0001-01-01`. Overwritten by the customer's `forced_due_days` when set (a rule). |
| Reference | trimmed, blank → omitted | `[MaxLength(50)]`, *unique* in `OrderWrite` and a filtered unique index, checked on the reference the rules left. Cleared when the customer changes and the reference was left as is (a rule). |
| At least one line | `.min(1, "Add at least one line")` | `[Required, MinLength(1)] List<OrderLine>` |
| Product | `.min(1, "Required")` | `[Required, MaxLength(200)]` |
| Quantity | integer, `≥ 1` | `[Range(1, int.MaxValue)]` |
| Unit price | `≥ 0` | `[Range(0, double.MaxValue)]` |

Two .NET 10 details:

- Nested items are only validated through a generic collection. `Lines` is a `List<OrderLine>`. As an `OrderLine[]`, the validation generator never registers `OrderLine` and a quantity of 0 passes.
- Built-in keys name C# members (`Lines[0].Quantity`). `Program.cs` camelCases them in `CustomizeProblemDetails`, so they match the form's field paths.

## Server errors land on fields

The server answers a failed save with RFC 9457 problem+json:

```json
{ "title": "One or more validation errors occurred.", "status": 400,
  "errors": { "customer": ["Umbrella is on credit hold."], "lines[0].quantity": ["At least 1"] } }
```

1. `sendJson` (`web/src/api/http.ts`) returns a 4xx problem as a **value**, `{ ok: false, problem }`, and throws only for unexpected failures (5xx, network).
2. The save is the form's **last validator**, `onSubmitAsync: submitTo(schema, save)` (`shared/components/form/submit-to.ts`). It runs only after layers 1 and 2 pass. It turns `problem.errors` into `{ form: title, fields: { "lines[0].quantity": "At least 1" } }`, TanStack Form's shape for "these fields failed".
3. TanStack Form puts each message on the field at that path. Server keys and form paths are the same strings (`lines[0].quantity`), so no mapping table is needed. A problem without `errors` (a `404`, a bad enum) becomes a form-level message, shown in the `role="alert"` paragraph above the buttons.

Because the save is a validator, a failed save leaves the form invalid and `onSubmit` doesn't run. `onSubmit` is reached only after a successful save. It resets the form to the saved values (so the unsaved-changes guard lets you leave) and calls `onDone`.

## Server reads and writes: `useOrderFormData`

The form component makes no `fetch` calls. The hook gives it:

- `customers`: the picker's names, from the session-cached `["customer-options"]` query (the filter uses the same query). An order names its customer, and the API resolves the name.
- `save`: a `useMutation` over `saveOrder`, which `POST`s when `orderNo` is `null` and `PUT`s otherwise. A returned problem (`ok: false`) counts as a successful mutation, so React Query reports a mutation error only for real failures. On `ok: true`, the hook invalidates `["orders"]` and `["order"]` and publishes `Created ORD-…` / `Updated ORD-…` on the shell's event bus (the footer shows it, whichever app saved).
- `isReferenceTaken`: the layer 2 check, excluding the order being edited.

`orderFormOptions` declares `onSubmitAsync: submitOrder(saveOrder)`, which calls the API directly, because `withForm` sections (`OrderLines`) must be typed against the same validators as the form. `OrderForm` then replaces that validator with `submitOrder(save)`, the mutation version. Both have the same type.

## Create and edit

- **Create**: `NewOrder` renders `OrderForm` with `emptyOrderForm()`.
- **Edit**: the route's loader **awaits** the order (`orderRouteLoader`, `staleTime: "static"`), because the form reads `defaultValues` once, at mount. `EditOrder` reads it with `useSuspenseQuery` and renders `<OrderForm key={orderNo} order={order} />`. The `key` remounts the form when you go from one order to another. A missing order (`404`) throws in the loader, and the router's error component renders inside the shell.
- **On the server**, `POST` and `PUT` share `OrderInput` and `OrderWrite.ApplyAsync`, which copies the input onto the entity (`OrderMapper`) and then runs the rules, which may overwrite some of it. `PUT` replaces the whole order: the lines are cleared and re-added, and EF deletes the orphans. `CreateOrder` returns `201` with `Location: /api/orders/ORD-…`, and `UpdateOrder` returns `200` or `404`. Both bodies are the `OrderDetail`, so the response has the same shape as the edit form's input.

## Read only without the right role

Saving needs the app's `orders.write` scope and the user's `order-editor` role, which is what `POST` / `PUT /api/orders` require ([OIDC](oidc.md)). The form asks the shell, `useShell().can(ORDER_WRITE)`, and without that permission:

- it shows "Read only: saving an order needs the order-editor role.";
- it wraps every control and the submit button in a `<fieldset disabled>`;
- it renames Cancel to **Back**.

App 1 also hides **New order**. This is a convenience: the API still answers `403`, and a `403` problem on a save becomes a form-level message like any other.

## Unsaved changes

`useBlocker` in `OrderForm` asks "Discard unsaved changes?" when you navigate away from a dirty form. `enableBeforeUnload` covers closing or reloading the tab. Both read `form.state.isDefaultValue` when they fire, instead of subscribing to it, so a keystroke doesn't re-render the whole form.

## The kit

- `FormField` (in `form/fields.tsx`) reads the field from context and renders the label, the control (with `id`, `aria-invalid`, `aria-describedby`) and the first error, or "Checking…" while an async check runs. Every field component goes through it, so a form never repeats label or error markup.
- `form.AppField name="…"` → `field.TextField`, etc. Array fields use `mode="array"` with index paths (`lines[${i}].quantity`), the same paths the server's error keys use.
- `withForm({ ...orderFormOptions, render })` splits a section (the lines) into its own component that still receives the parent's typed `form`.

## Adding a form field (example: an order `note`)

1. **Back:** `db/up/000N_add_order_note.sql`, then `OrderEntity.Note` + `OrderEntityConfiguration` (must match the SQL, because tests build tables from the EF model), `OrderInput.Note` with its attributes, the copy in `OrderMapper.MapFrom` and `ToDetail` (`OrderMapperTests` fails until both are there), and `OrderDetail`.
2. **Front:** `OrderInput` / `OrderDetail` in `web/src/api/orders.ts`, `OrderFormValues`, `orderFormSchema` (rule and transform), `emptyOrderForm`, `toFormValues`, and a `<form.AppField name="note">`.
3. **Test:** an `OrdersTests` case for any new server rule, with the error key the form expects.
