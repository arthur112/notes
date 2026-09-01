import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useShell } from "../../shell/ShellProvider";
import { EditorialSection, EditorialWidget } from "./EditorialStats";
import { formatMonth, type Month } from "./MonthPicker";
import { SearchBar } from "./SearchBar";

type Project = {
    id: string;
    name: string;
    status: "active" | "paused" | "done";
    month: Month;
    budget: number;
};

const projects: Project[] = [
    {
        id: "PRJ-001",
        name: "Verdant rebranding",
        status: "active",
        month: { year: 2025, month: 0 },
        budget: 12400,
    },
    {
        id: "PRJ-002",
        name: "Billing migration",
        status: "active",
        month: { year: 2025, month: 0 },
        budget: 45800,
    },
    {
        id: "PRJ-003",
        name: "Mobile app v2",
        status: "paused",
        month: { year: 2025, month: 1 },
        budget: 81500,
    },
    {
        id: "PRJ-004",
        name: "Data warehouse",
        status: "active",
        month: { year: 2025, month: 2 },
        budget: 63200,
    },
    {
        id: "PRJ-005",
        name: "Customer portal",
        status: "done",
        month: { year: 2025, month: 2 },
        budget: 27900,
    },
    {
        id: "PRJ-006",
        name: "SSO rollout",
        status: "done",
        month: { year: 2025, month: 3 },
        budget: 9800,
    },
    {
        id: "PRJ-007",
        name: "AI support pilot",
        status: "paused",
        month: { year: 2025, month: 4 },
        budget: 54000,
    },
    {
        id: "PRJ-008",
        name: "Design system",
        status: "active",
        month: { year: 2025, month: 5 },
        budget: 19750,
    },
];

const statusOptions = [
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "done", label: "Done" },
];

const eur = (n: number) => `€${n.toLocaleString()}`;

const revenue = { current: 45231, previous: 37650 };

const sections = [
    {
        title: "Projects",
        lines: [
            { label: "Active", value: "4" },
            { label: "Paused", value: "2" },
            { label: "Done", value: "2" },
        ],
    },
    {
        title: "Billing",
        lines: [
            { label: "Invoiced", value: "€45,231" },
            { label: "Collected", value: "€38,900" },
            { label: "Overdue", value: "€3,150" },
        ],
    },
    {
        title: "Support",
        lines: [
            { label: "Open tickets", value: "12" },
            { label: "Avg. response", value: "2.4h" },
            { label: "CSAT", value: "94%" },
        ],
    },
];

export function App() {
    const { publish } = useShell();
    const [query, setQuery] = useState("");
    const [month, setMonth] = useState<Month | null>(null);
    const [statuses, setStatuses] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);

    const filtered = useMemo(
        () =>
            projects.filter(
                (p) =>
                    p.name.toLowerCase().includes(query.trim().toLowerCase()) &&
                    (!month ||
                        (p.month.year === month.year &&
                            p.month.month === month.month)) &&
                    (statuses.length === 0 || statuses.includes(p.status)),
            ),
        [query, month, statuses],
    );

    const select = (project: Project) => {
        setSelected(project.id);
        publish("showcase", `Selected ${project.id} (${project.name})`);
    };

    return (
        <div>
            <h1>Components</h1>

            <div className="grid items-start gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <EditorialWidget
                    label="Revenue"
                    current={revenue.current}
                    previous={revenue.previous}
                    format={eur}
                />
                {sections.map((section) => (
                    <EditorialSection
                        key={section.title}
                        title={section.title}
                        lines={section.lines}
                    />
                ))}
            </div>

            <div className="mt-12 flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">Projects</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                    {filtered.length} of {projects.length}
                </span>
            </div>

            <div className="mt-3">
                <SearchBar
                    query={query}
                    onQueryChange={setQuery}
                    month={month}
                    onMonthChange={setMonth}
                    statuses={statuses}
                    onStatusesChange={setStatuses}
                    statusOptions={statusOptions}
                />
            </div>

            {(month || statuses.length > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {month && (
                        <Badge variant="secondary">
                            {formatMonth(month)}
                            <button
                                type="button"
                                aria-label="Clear month"
                                onClick={() => setMonth(null)}
                            >
                                <X />
                            </button>
                        </Badge>
                    )}
                    {statuses.map((status) => (
                        <Badge key={status} variant="secondary">
                            {statusOptions.find((o) => o.value === status)
                                ?.label ?? status}
                            <button
                                type="button"
                                aria-label={`Remove ${status}`}
                                onClick={() =>
                                    setStatuses(
                                        statuses.filter((s) => s !== status),
                                    )
                                }
                            >
                                <X />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            <table className="mt-3">
                <thead>
                    <tr>
                        <th>Id</th>
                        <th>Project</th>
                        <th>Month</th>
                        <th>Status</th>
                        <th>Budget</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map((p) => (
                        <tr
                            key={p.id}
                            className={
                                p.id === selected ? "selected" : undefined
                            }
                            onClick={() => select(p)}
                        >
                            <td>{p.id}</td>
                            <td>{p.name}</td>
                            <td>{formatMonth(p.month)}</td>
                            <td>{p.status}</td>
                            <td>€{p.budget.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="hint">
                The table filters live as you type, pick a month, or toggle
                statuses. Click a row — the shell footer shows the event this
                app publishes.
            </p>
        </div>
    );
}
