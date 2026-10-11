import { createFormHookContexts } from "@tanstack/react-form";

/**
 * The contexts behind `useAppForm`. Kept apart from `use-app-form.ts` so the
 * field components can read them without importing the hook that registers them.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();
