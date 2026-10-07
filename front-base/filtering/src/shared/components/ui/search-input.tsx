import type * as React from "react";
import { Search } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

import { CONTROL_CLASS } from "./control";

export type SearchInputProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  value: string;
  onChange: (next: string) => void;
};

/** Text input with a leading search icon. */
export function SearchInput({ value, onChange, className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROL_CLASS, "pl-9")}
      />
    </div>
  );
}
