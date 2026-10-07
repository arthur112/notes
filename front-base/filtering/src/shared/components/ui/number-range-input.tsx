import { cn } from "@/shared/lib/utils";

import { NumberInput } from "./number-input";

/** Raw min/max text; an empty string means "no bound". */
export type NumberRange = { min: string; max: string };

export type NumberRangeInputProps = {
  value: NumberRange;
  onChange: (next: NumberRange) => void;
  /** Accessible names of the two inputs. */
  minAriaLabel?: string;
  maxAriaLabel?: string;
  /** Forwarded to the `min` input so a `<label htmlFor>` focuses it. */
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  disabled?: boolean;
  className?: string;
};

/** Two number inputs, `Min – Max`. */
export function NumberRangeInput({
  value,
  onChange,
  minAriaLabel = "Minimum",
  maxAriaLabel = "Maximum",
  id,
  className,
  ...shared
}: NumberRangeInputProps) {
  return (
    <div role="group" className={cn("flex items-center gap-2", className)}>
      <NumberInput
        {...shared}
        id={id}
        aria-label={minAriaLabel}
        placeholder="Min"
        value={value.min}
        onChange={(min) => onChange({ ...value, min })}
      />
      <span className="text-muted-foreground">–</span>
      <NumberInput
        {...shared}
        aria-label={maxAriaLabel}
        placeholder="Max"
        value={value.max}
        onChange={(max) => onChange({ ...value, max })}
      />
    </div>
  );
}
