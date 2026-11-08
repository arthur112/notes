import { createFormHook } from "@tanstack/react-form";

import { DateField, NumberField, SelectField, SubmitButton, TextField } from "./fields";
import { fieldContext, formContext } from "./form-context";

/**
 * The app's one form hook. Fields render through `form.AppField` as
 * `field.TextField`, …, and the form exposes `form.SubmitButton`, so a form
 * never repeats label / error markup.
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { TextField, NumberField, SelectField, DateField },
  formComponents: { SubmitButton },
});
