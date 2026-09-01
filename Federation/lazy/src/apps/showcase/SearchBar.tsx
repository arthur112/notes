import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { MonthPicker, type Month } from "./MonthPicker";
import { MultiSelect, type MultiSelectOption } from "./MultiSelect";

type SearchBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  month: Month | null;
  onMonthChange: (month: Month) => void;
  statuses: string[];
  onStatusesChange: (statuses: string[]) => void;
  statusOptions: MultiSelectOption[];
};

/** A search bar: free-text input + month picker + searchable multi-select. */
export function SearchBar({
  query,
  onQueryChange,
  month,
  onMonthChange,
  statuses,
  onStatusesChange,
  statusOptions,
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search projects…"
          className="h-10 pl-9"
        />
      </div>
      <MonthPicker
        value={month}
        onChange={onMonthChange}
        className="h-10 sm:w-40"
      />
      <MultiSelect
        options={statusOptions}
        value={statuses}
        onChange={onStatusesChange}
        placeholder="Status"
        className="h-10 sm:w-44"
      />
    </div>
  );
}
