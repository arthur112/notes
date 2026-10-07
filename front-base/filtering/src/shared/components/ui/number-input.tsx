import type * as React from "react";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

import { CONTROL_CLASS } from "./control";

export type NumberInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  /** Raw text, so half-typed values (`"10,"`) survive; parse where you use it. */
  value: string;
  onChange: (next: string) => void;
};

/** Decimal input with tabular figures. */
export function NumberInput({ value, onChange, className, ...props }: NumberInputProps) {
  return (
    <Input
      inputMode="decimal"
      {...props}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(CONTROL_CLASS, "tabular-nums", className)}
    />
  );
}
