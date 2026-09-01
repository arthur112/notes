import {
    Banknote,
    FolderKanban,
    LifeBuoy,
    TrendingDown,
    TrendingUp,
    Wallet,
    type LucideIcon,
} from "lucide-react";

import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ProjectsTable } from "./ProjectsTable";
import { ProjectsToolbar } from "./ProjectsToolbar";
import {
    delta,
    eur,
    projects,
    revenue,
    sections,
    type ShowcaseState,
} from "./data";

const activeCount = projects.filter((p) => p.status === "active").length;
const pipeline = projects
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.budget, 0);

type Stat = {
    label: string;
    icon: LucideIcon;
    value: string;
    suffix: string;
    delta?: { current: number; previous: number };
};

const stats: Stat[] = [
    {
        label: "Revenue 2025",
        icon: Wallet,
        value: eur(revenue.current),
        delta: { current: revenue.current, previous: revenue.previous },
        suffix: "vs 2024",
    },
    {
        label: "Active projects",
        icon: FolderKanban,
        value: `${activeCount}`,
        suffix: `of ${projects.length} total`,
    },
    {
        label: "Open tickets",
        icon: LifeBuoy,
        value: "12",
        suffix: "2.4h avg response",
    },
    {
        label: "Pipeline",
        icon: Banknote,
        value: eur(pipeline),
        suffix: "active budgets",
    },
];

function StatDelta({
    current,
    previous,
}: {
    current: number;
    previous: number;
}) {
    const { delta: pct, up } = delta(current, previous);
    return (
        <p className="mt-1.5 flex items-center gap-1 text-sm">
            {up ? (
                <TrendingUp className="size-4 text-primary" />
            ) : (
                <TrendingDown className="size-4 text-destructive" />
            )}
            <span
                className={cn(
                    "font-medium",
                    up ? "text-primary" : "text-destructive",
                )}
            >
                {up ? "+" : ""}
                {pct.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs 2024</span>
        </p>
    );
}

/** Design 2 — classic shadcn dashboard: icon stat cards + section cards. */
export function CardShowcase({ state }: { state: ShowcaseState }) {
    return (
        <div>
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label}>
                        <CardHeader>
                            <CardDescription>{stat.label}</CardDescription>
                            <CardAction>
                                <div className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                                    <stat.icon className="size-4" />
                                </div>
                            </CardAction>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-semibold tracking-tight tabular-nums">
                                {stat.value}
                            </div>
                            {stat.delta ? (
                                <StatDelta
                                    current={stat.delta.current}
                                    previous={stat.delta.previous}
                                />
                            ) : (
                                <p className="mt-1.5 text-sm text-muted-foreground">
                                    {stat.suffix}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sections.map((section) => (
                    <Card key={section.title} className="gap-3 py-5">
                        <CardHeader className="px-5">
                            <CardTitle className="text-sm">
                                {section.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5">
                            <dl className="divide-y divide-border">
                                {section.lines.map((line) => (
                                    <div
                                        key={line.label}
                                        className="flex items-baseline justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
                                    >
                                        <dt className="text-muted-foreground">
                                            {line.label}
                                        </dt>
                                        <dd className="font-medium tabular-nums">
                                            {line.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <ProjectsToolbar state={state} />
            <ProjectsTable state={state} />
        </div>
    );
}
