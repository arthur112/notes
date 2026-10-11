import { useId, type ReactNode } from "react";

import { Button } from "@/shared/components/ui/button";
import { CONTROL_CLASS, type ControlProps } from "@/shared/components/ui/control";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Input } from "@/shared/components/ui/input";
import { NumberInput } from "@/shared/components/ui/number-input";
import { SearchSelect, type SearchSelectOption } from "@/shared/components/ui/search-select";
import type { Ymd } from "@/shared/lib/date";
import { cn } from "@/shared/lib/utils";

import { useFieldContext, useFormContext } from "./form-context";

/** Errors are strings (custom validators, server) or Standard Schema issues (Zod). */
export function firstError(errors: readonly unknown[]): string | undefined {
  for (const error of errors) {
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) return String(error.message);
  }
}

/**
 * The form counterpart of `FilterField`: a label above the control and its
 * error below, wired with `htmlFor` / `aria-describedby`. It reads the field
 * from context, so every field component renders the same way.
 */
export function FormField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const field = useFieldContext<unknown>();
  const id = useId();
  const error = firstError(field.state.meta.errors);
  const messageId = `${id}-message`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : field.state.meta.isValidating ? (
        <p className="text-xs text-muted-foreground">Checking…</p>
      ) : null}
    </div>
  );
}

type FieldProps = { label: string; className?: string };

export function TextField({
  label,
  className,
  placeholder,
}: FieldProps & { placeholder?: string }) {
  const field = useFieldContext<string>();
  return (
    <FormField label={label} className={className}>
      {(control) => (
        <Input
          {...control}
          name={field.name}
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
          onBlur={field.handleBlur}
          placeholder={placeholder}
          className={CONTROL_CLASS}
        />
      )}
    </FormField>
  );
}

/** Raw text, so `"10,"` survives; the form's schema parses it. */
export function NumberField({ label, className }: FieldProps) {
  const field = useFieldContext<string>();
  return (
    <FormField label={label} className={className}>
      {(control) => (
        <NumberInput
          {...control}
          name={field.name}
          value={field.state.value}
          onChange={field.handleChange}
          onBlur={field.handleBlur}
        />
      )}
    </FormField>
  );
}

export function SelectField({
  label,
  className,
  options,
  placeholder,
}: FieldProps & { options: readonly SearchSelectOption[]; placeholder?: string }) {
  const field = useFieldContext<string | null>();
  return (
    <FormField label={label} className={className}>
      {(control) => (
        <SearchSelect
          {...control}
          options={options}
          value={field.state.value}
          onChange={field.handleChange}
          placeholder={placeholder}
        />
      )}
    </FormField>
  );
}

export function DateField({ label, className }: FieldProps) {
  const field = useFieldContext<Ymd | null>();
  return (
    <FormField label={label} className={className}>
      {(control) => (
        <DatePicker {...control} value={field.state.value} onChange={field.handleChange} />
      )}
    </FormField>
  );
}

/**
 * Disabled only while submitting, not on `!canSubmit`: clicking it on an
 * invalid form is what reveals the errors, and a stale error never locks it.
 */
export function SubmitButton({ children }: { children: ReactNode }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : children}
        </Button>
      )}
    </form.Subscribe>
  );
}
