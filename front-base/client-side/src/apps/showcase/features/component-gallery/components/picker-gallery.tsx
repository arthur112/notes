import { useState, type ReactNode } from "react";

import { DatePicker, DateRangePicker, type DateRange } from "@/shared/components/ui/date-picker";
import { MonthPicker } from "@/shared/components/ui/month-picker";
import { MultiSelect } from "@/shared/components/ui/multi-select";
import { SearchSelect } from "@/shared/components/ui/search-select";
import { YearPicker } from "@/shared/components/ui/year-picker";
import { formatMonth, type Month, type Ymd } from "@/shared/lib/date";
import { SAMPLE_PROJECTS } from "../types/gallery-sample";

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In progress" },
  { value: "shipped", label: "Shipped" },
  { value: "done", label: "Done" },
];

const OWNER_OPTIONS = [...new Set(SAMPLE_PROJECTS.map((p) => p.owner))].map((owner) => ({
  value: owner,
  label: owner,
}));

function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-xs break-all">{children || "—"}</p>
    </div>
  );
}

/** Interactive showcase of every shared picker/combo with value readouts. */
export function PickerGallery() {
  const [year, setYear] = useState<number | null>(2026);
  const [month, setMonth] = useState<Month | null>({ year: 2026, month: 6 });
  const [statuses, setStatuses] = useState<string[]>(["in-progress"]);
  const [owner, setOwner] = useState<string | null>("Mira");
  const [date, setDate] = useState<Ymd | null>("2026-09-18");
  const [range, setRange] = useState<DateRange>({ from: "2026-09-01", to: "2026-09-30" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <YearPicker value={year} onChange={setYear} />
        <MonthPicker value={month} onChange={setMonth} />
        <DatePicker value={date} onChange={setDate} />
        <DateRangePicker value={range} onChange={setRange} />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <MultiSelect
          options={STATUS_OPTIONS}
          value={statuses}
          onChange={setStatuses}
          placeholder="Statuses…"
          className="min-w-44"
        />
        <SearchSelect
          options={OWNER_OPTIONS}
          value={owner}
          onChange={setOwner}
          placeholder="Owner…"
          className="min-w-44"
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Readout label="YearPicker">{year}</Readout>
        <Readout label="MonthPicker">{month ? formatMonth(month) : null}</Readout>
        <Readout label="DatePicker">{date}</Readout>
        <Readout label="DateRangePicker">
          {range.from && range.to ? `${range.from} → ${range.to}` : "—"}
        </Readout>
      </div>
    </div>
  );
}
