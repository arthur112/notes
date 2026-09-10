import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check, Minus } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * Dumb Base UI checkbox. The visual box is a `<span>`; the real `<input>` is
 * rendered (visually hidden) by the primitive, so it stays keyboard- and
 * form-accessible.
 */
function Checkbox({ className, indeterminate, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      indeterminate={indeterminate}
      className={cn(
        "relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border border-input bg-transparent text-primary-foreground transition-colors outline-none",
        "data-checked:border-primary data-checked:bg-primary",
        "data-indeterminate:border-primary data-indeterminate:bg-primary",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator">
        {indeterminate ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
