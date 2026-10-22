import { ListFilter } from "lucide-react";

import { FilterField } from "@/shared/components/filter-field";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";

import type {
  AnyFilterField,
  FilterDefinition,
  FilterFieldMap,
  FilterSearch,
  FilterSearchInput,
  SortFieldMap,
} from "./definition";

export type FilterBarProps<M extends FilterFieldMap, S extends SortFieldMap> = {
  definition: FilterDefinition<M, S>;
  /** The settled filter, from the URL. */
  search: FilterSearch<M>;
  /** Raw control values; the route's `validateSearch` parses them. */
  onPatch: (changes: FilterSearchInput<M>) => void;
  /** Backs the popover's "Clear filters" button; no button when absent. */
  onClear?: () => void;
};

/**
 * A search bar plus a "Filters" popover holding the other fields, driven by a
 * filter definition. Inline fields (the free-text search) sit in the bar;
 * popover fields are labeled and the trigger counts the set ones. Picks are
 * patched at once; typed fields keep a draft while edited and patch once
 * typing pauses or the field loses focus (`useBufferedValue`, in the field).
 */
export function FilterBar<M extends FilterFieldMap, S extends SortFieldMap>({
  definition,
  search,
  onPatch,
  onClear,
}: FilterBarProps<M, S>) {
  const values = search as Record<string, unknown>;
  const inline = definition.entries.filter(([, field]) => field.placement === "inline");
  const popover = definition.entries.filter(([, field]) => field.placement === "popover");
  const activeCount = popover.filter(([key]) => values[key] !== undefined).length;

  const patch = (key: string, value: unknown) => onPatch({ [key]: value } as FilterSearchInput<M>);

  return (
    <div className="flex gap-2">
      <div className="flex flex-1 flex-col gap-2">
        {inline.map(([key, field]) => (
          <FieldControl
            key={key}
            field={field}
            value={values[key]}
            onPatch={patch}
            filterKey={key}
          />
        ))}
      </div>

      <Popover>
        <PopoverTrigger className={buttonVariants({ variant: "outline", size: "lg" })}>
          <ListFilter />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-4">
          {popover.map(([key, field]) => (
            <FilterField key={key} label={field.label}>
              <FieldControl field={field} value={values[key]} onPatch={patch} filterKey={key} />
            </FilterField>
          ))}

          {onClear && (
            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              disabled={activeCount === 0}
              onClick={onClear}
            >
              Clear filters
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * One field's control. Defined outside the bar's render so the control type
 * stays stable; each typed control buffers its own draft, so a keystroke
 * re-renders that field only.
 */
function FieldControl({
  field,
  value,
  onPatch,
  filterKey,
}: {
  field: AnyFilterField;
  value: unknown;
  onPatch: (key: string, value: unknown) => void;
  filterKey: string;
}) {
  const Control = field.control;
  return (
    <Control
      value={field.toControlValue(value)}
      onChange={(next: unknown) => onPatch(filterKey, next)}
    />
  );
}
