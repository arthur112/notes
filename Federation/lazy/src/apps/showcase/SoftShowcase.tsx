import { cn } from "@/lib/utils";
import { ProjectsTable } from "./ProjectsTable";
import { ProjectsToolbar } from "./ProjectsToolbar";
import { delta, eur, revenue, sections, type ShowcaseState } from "./data";

const softCard =
    "rounded-3xl border-none bg-card p-6 shadow-lg shadow-foreground/5 ring-1 ring-border/60";

function SoftDelta({
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
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
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

/** Design 5 — soft UI: chrome-free rounded cards, pill chips, tinted statuses. */
export function SoftShowcase({ state }: { state: ShowcaseState }) {
    return (
        <div>
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className={softCard}>
                    <div className="text-sm font-medium text-muted-foreground">
                        Revenue 2025
                    </div>
                    <div className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
                        {eur(revenue.current)}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        <SoftDelta
                            current={revenue.current}
                            previous={revenue.previous}
                        />
                        <span className="text-muted-foreground">vs 2024</span>
                    </div>
                </div>

                {sections.map((section) => (
                    <div key={section.title} className={softCard}>
                        <div className="text-sm font-medium text-muted-foreground">
                            {section.title}
                        </div>
                        <dl className="mt-3 space-y-1">
                            {section.lines.map((line) => (
                                <div
                                    key={line.label}
                                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-sm transition-colors odd:bg-muted/60"
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
                    </div>
                ))}
            </div>

            <ProjectsToolbar state={state} />

            <div className="mt-3">
                <ProjectsTable state={state} />
            </div>
            <p className="hint mt-2">
                Statuses stay muted here on purpose — the soft look leans on the
                tinted cards above, not on row colour.
            </p>
        </div>
    );
}
