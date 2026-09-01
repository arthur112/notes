import { useMemo, useState } from "react";

import { useShell } from "../../shell/ShellProvider";
import type { Month } from "./MonthPicker";
import type { MultiSelectOption } from "./MultiSelect";

export type Project = {
    id: string;
    name: string;
    status: "active" | "paused" | "done";
    month: Month;
    budget: number;
};

export const projects: Project[] = [
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

export const statusOptions: MultiSelectOption[] = [
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "done", label: "Done" },
];

export const eur = (n: number) => `€${n.toLocaleString()}`;

export const revenue = { current: 45231, previous: 37650 };

export const sections = [
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

/** Percentage change between two values, plus its direction. */
export function delta(current: number, previous: number) {
    const pct = ((current - previous) / previous) * 100;
    return { delta: pct, up: pct >= 0 };
}

export const statusMeta: Record<
    Project["status"],
    { label: string; dot: string; tag: string }
> = {
    active: { label: "Active", dot: "bg-primary", tag: "[ACTIVE]" },
    paused: { label: "Paused", dot: "bg-chart-5", tag: "[PAUSED]" },
    done: { label: "Done", dot: "bg-muted-foreground/50", tag: "[DONE]" },
};

export type ShowcaseState = {
    query: string;
    onQueryChange: (query: string) => void;
    month: Month | null;
    onMonthChange: (month: Month | null) => void;
    statuses: string[];
    onStatusesChange: (statuses: string[]) => void;
    statusOptions: MultiSelectOption[];
    filtered: Project[];
    total: number;
    selected: string | null;
    onSelect: (project: Project) => void;
};

/** All filtering + selection state the five designs share. */
export function useShowcase(): ShowcaseState {
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

    return {
        query,
        onQueryChange: setQuery,
        month,
        onMonthChange: setMonth,
        statuses,
        onStatusesChange: setStatuses,
        statusOptions,
        filtered,
        total: projects.length,
        selected,
        onSelect: select,
    };
}
