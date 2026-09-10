import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { MonthPicker } from "@/shared/components/ui/month-picker";
import { formatMonth, type Month, type Ymd } from "@/shared/lib/date";

/** A smart/shared integration demo: dumb pickers bound to TanStack Form fields. */
export function FormDemo() {
  const form = useForm({
    defaultValues: { title: "", date: "" as Ymd, month: null as Month | null },
    onSubmit: async ({ value }) => {
      toast.success("Demo form submitted", {
        description: `${value.title} · ${value.date || "no date"} · ${
          value.month ? formatMonth(value.month) : "no month"
        }`,
      });
    },
  });

  const errorOf = (errors: unknown): string | undefined => {
    const first = Array.isArray(errors) ? errors[0] : errors;
    if (typeof first === "string") return first;
    if (typeof first === "object" && first !== null && "message" in first) {
      const message = (first as { message: unknown }).message;
      if (typeof message === "string") return message;
    }
    return undefined;
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      className="max-w-md space-y-4"
    >
      <form.Field
        name="title"
        validators={{ onChange: z.string().min(3, "Title needs at least 3 characters") }}
      >
        {(field) => (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Title *</span>
            <Input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="e.g. Order API v2"
              aria-invalid={Boolean(errorOf(field.state.meta.errors))}
            />
            {errorOf(field.state.meta.errors) && (
              <p className="mt-1 text-xs text-destructive">{errorOf(field.state.meta.errors)}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field name="date" validators={{ onChange: z.string().min(1, "Pick a date") }}>
        {(field) => (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Date *</span>
            <DatePicker
              value={field.state.value || null}
              onChange={(next) => field.handleChange(next ?? "")}
              className="w-full"
            />
            {errorOf(field.state.meta.errors) && (
              <p className="mt-1 text-xs text-destructive">{errorOf(field.state.meta.errors)}</p>
            )}
          </div>
        )}
      </form.Field>

      <form.Field
        name="month"
        validators={{
          onChange: z
            .object({ year: z.number(), month: z.number() })
            .nullable()
            .refine((m) => m !== null, "Pick a month"),
        }}
      >
        {(field) => (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Month deadline
            </span>
            <MonthPicker
              value={field.state.value}
              onChange={(next) => field.handleChange(next)}
              className="w-full"
            />
            {errorOf(field.state.meta.errors) && (
              <p className="mt-1 text-xs text-destructive">{errorOf(field.state.meta.errors)}</p>
            )}
          </div>
        )}
      </form.Field>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit">Submit demo</Button>
        <Button type="button" variant="ghost" onClick={() => form.reset()}>
          Reset
        </Button>
      </div>
    </form>
  );
}
