import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatMonth, type Month } from "./MonthPicker";
import type { MultiSelectOption } from "./MultiSelect";

type FilterBadgesProps = {
  month: Month | null;
  onMonthChange: (month: Month | null) => void;
  statuses: string[];
  onStatusesChange: (statuses: string[]) => void;
  statusOptions: MultiSelectOption[];
};

/** Active-filter chips with a remove button each. */
export function FilterBadges({
  month,
  onMonthChange,
  statuses,
  onStatusesChange,
  statusOptions,
}: FilterBadgesProps) {
  if (!month && statuses.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {month && (
        <Badge variant="secondary">
          {formatMonth(month)}
          <button
            type="button"
            aria-label="Clear month"
            onClick={() => onMonthChange(null)}
          >
            <X />
          </button>
        </Badge>
      )}
      {statuses.map((status) => (
        <Badge key={status} variant="secondary">
          {statusOptions.find((o) => o.value === status)?.label ?? status}
          <button
            type="button"
            aria-label={`Remove ${status}`}
            onClick={() =>
              onStatusesChange(statuses.filter((s) => s !== status))
            }
          >
            <X />
          </button>
        </Badge>
      ))}
    </div>
  );
}
