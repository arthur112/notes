import { cn } from "@/shared/lib/utils";

import type { ControlProps } from "./control";
import { NumberInput } from "./number-input";

/** Raw min/max text; an empty string means "no bound". */
export type NumberRange = { min: string; max: string };

/** `id` goes to the `min` input so a `<label htmlFor>` focuses it. */
export type NumberRangeInputProps = Omit<ControlProps, "aria-label"> & {
  value: NumberRange;
  onChange: (next: NumberRange) => void;
  /** Fires when focus leaves the group, not when it moves between the two inputs. */
  onBlur?: () => void;
  /** Accessible names of the two inputs. */
  minAriaLabel?: string;
  maxAriaLabel?: string;
};

/** Two number inputs, `Min – Max`. */
export function NumberRangeInput({
  value,
  onChange,
  onBlur,
  minAriaLabel = "Minimum",
  maxAriaLabel = "Maximum",
  id,
  className,
  ...shared
}: NumberRangeInputProps) {
  return (
    <div
      role="group"
      onBlur={(event) => {
        // Moving between min and max stays inside the group: not a blur.
        if (!event.currentTarget.contains(event.relatedTarget)) onBlur?.();
      }}
      className={cn("flex items-center gap-2", className)}
    >
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
