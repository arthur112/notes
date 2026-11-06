import type { z } from "zod";

import { fieldErrors, type ApiResult } from "@/shared/lib/problem";

/**
 * A form's save, as its last validator (`onSubmitAsync`), for any form whose
 * zod schema turns the raw values into the API payload. It runs only once the
 * schema passes; `value` is the schema's *input* (raw strings), so it is parsed
 * again for the typed payload. A validation problem (its `errors`) lands on the
 * fields the server named (each clears when its field changes) plus a
 * form-level message; any other problem, or an unexpected failure (network
 * down), is a form-level message.
 *
 * `TValues` (the form's values) can't be inferred, so each form binds it once
 * in its options, e.g. `submitTo<OrderFormValues, OrderPayload>(schema, save)`:
 * the shared `formOptions` passes the plain API call (fixing the validator type
 * `withForm` sections need), the component its mutation's `mutateAsync`.
 */
export function submitTo<TValues, TPayload>(
  schema: z.ZodType<TPayload>,
  save: (payload: TPayload) => Promise<ApiResult<unknown>>,
) {
  return async ({ value }: { value: TValues }) => {
    try {
      const result = await save(schema.parse(value));
      if (result.ok) return undefined;
      const { problem } = result;
      return problem.errors
        ? { form: problem.title, fields: fieldErrors(problem.errors) }
        : (problem.detail ?? problem.title);
    } catch (error) {
      return error instanceof Error ? error.message : "Could not save.";
    }
  };
}
