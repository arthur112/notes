import { formatMonth } from "./MonthPicker";
import { ProjectsToolbar } from "./ProjectsToolbar";
import {
    delta,
    eur,
    projects,
    revenue,
    sections,
    statusMeta,
    type ShowcaseState,
} from "./data";
import { cn } from "@/lib/utils";

const statusCounts = {
    active: projects.filter((p) => p.status === "active").length,
    paused: projects.filter((p) => p.status === "paused").length,
    done: projects.filter((p) => p.status === "done").length,
};

const pipeline = projects
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.budget, 0);

function DeltaChip({
    current,
    previous,
}: {
    current: number;
    previous: number;
}) {
    const { delta: pct, up } = delta(current, previous);
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                up
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive",
            )}
        >
            {up ? "▲" : "▼"} {up ? "+" : ""}
            {pct.toFixed(1)}%
        </span>
    );
}

function Tile({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "rounded-2xl border bg-card p-5 shadow-xs",
                className,
            )}
        >
            {children}
        </div>
    );
}

function TileLines({ lines }: { lines: { label: string; value: string }[] }) {
    return (
        <dl className="mt-4 space-y-2.5">
            {lines.map((line) => (
                <div
                    key={line.label}
                    className="flex items-baseline justify-between gap-2 text-sm"
                >
                    <dt className="text-muted-foreground">{line.label}</dt>
                    <dd className="font-medium tabular-nums">{line.value}</dd>
                </div>
            ))}
        </dl>
    );
}

/** Design 3 — bento grid: rounded tiles of varying spans, projects as cards. */
export function BentoShowcase({ state }: { state: ShowcaseState }) {
    return (
        <div>
            <div className="grid gap-3 sm:grid-cols-4">
                <Tile className="row-span-2 sm:col-span-2">
                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Revenue 2025
                    </div>
                    <div className="mt-3 text-5xl font-semibold tracking-tight tabular-nums">
                        {eur(revenue.current)}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        <DeltaChip
                            current={revenue.current}
                            previous={revenue.previous}
                        />
                        <span className="text-muted-foreground">
                            vs 2024 ({eur(revenue.previous)})
                        </span>
                    </div>
                </Tile>

                <Tile>
                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Projects
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tabular-nums">
                            {statusCounts.active}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            active
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                        {statusCounts.paused} paused · {statusCounts.done} done
                    </div>
                </Tile>

                <Tile>
                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Billing
                    </div>
                    <TileLines lines={sections[1].lines.slice(1)} />
                </Tile>

                <Tile>
                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Support
                    </div>
                    <TileLines lines={sections[2].lines} />
                </Tile>

                <Tile>
                    <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Pipeline
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tabular-nums">
                            {eur(pipeline)}
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                        active budgets
                    </div>
                </Tile>
            </div>

            <ProjectsToolbar state={state} />

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {state.filtered.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => state.onSelect(p)}
                        className={cn(
                            "cursor-pointer rounded-2xl border bg-card p-4 text-left shadow-xs transition-colors hover:border-primary/40",
                            p.id === state.selected &&
                                "border-primary ring-2 ring-primary/20",
                        )}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-muted-foreground">
                                {p.id}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span
                                    className={cn(
                                        "size-2 rounded-full",
                                        statusMeta[p.status].dot,
                                    )}
                                />
                                {statusMeta[p.status].label}
                            </span>
                        </div>
                        <div className="mt-2 text-sm font-medium">{p.name}</div>
                        <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
                            <span className="text-muted-foreground">
                                {formatMonth(p.month)}
                            </span>
                            <span className="font-medium tabular-nums">
                                €{p.budget.toLocaleString()}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
