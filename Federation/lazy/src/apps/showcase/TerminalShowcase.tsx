import { formatMonth } from "./MonthPicker";
import { ProjectsToolbar } from "./ProjectsToolbar";
import {
    delta,
    eur,
    revenue,
    sections,
    statusMeta,
    type ShowcaseState,
} from "./data";
import { cn } from "@/lib/utils";

function Panel({
    className,
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "overflow-hidden rounded-lg bg-foreground font-mono text-[13px] text-background",
                className,
            )}
        >
            {children}
        </div>
    );
}

function Prompt({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2 text-xs opacity-60">
            <span className="text-chart-5">$</span>
            {children}
        </div>
    );
}

/** A labelled stat line with a dotted leader, terminal-style. */
function TermLines({ lines }: { lines: { label: string; value: string }[] }) {
    return (
        <div className="mt-3">
            {lines.map((line) => (
                <div
                    key={line.label}
                    className="flex items-baseline gap-2 py-0.5"
                >
                    <span>{line.label}</span>
                    <span className="flex-1 border-b border-dotted opacity-30" />
                    <span className="tabular-nums">{line.value}</span>
                </div>
            ))}
        </div>
    );
}

/** Design 4 — terminal: inverted mono panels with prompt lines and dot leaders. */
export function TerminalShowcase({ state }: { state: ShowcaseState }) {
    const year = new Date().getFullYear();
    const { delta: revDelta, up } = delta(revenue.current, revenue.previous);

    return (
        <div>
            <Panel>
                <div className="border-b border-background/15 px-4 py-2 text-xs opacity-60">
                    verdant@studio:~ — overview
                </div>
                <div className="grid gap-x-8 gap-y-6 p-4 sm:grid-cols-2">
                    <div>
                        <Prompt>revenue --year {year}</Prompt>
                        <div className="mt-2 text-2xl font-semibold tabular-nums">
                            {eur(revenue.current)}
                        </div>
                        <div className="mt-1 text-xs">
                            <span
                                className={up ? "text-chart-5" : "opacity-80"}
                            >
                                {up
                                    ? "[▲ +20.1%]"
                                    : `[▼ ${revDelta.toFixed(1)}%]`}
                            </span>{" "}
                            <span className="opacity-60">
                                vs {year - 1} ({eur(revenue.previous)})
                            </span>
                        </div>
                    </div>
                    {sections.map((section) => (
                        <div key={section.title}>
                            <Prompt>
                                cat {section.title.toLowerCase()}.txt
                            </Prompt>
                            <TermLines lines={section.lines} />
                        </div>
                    ))}
                </div>
            </Panel>

            <ProjectsToolbar state={state} />

            <Panel className="mt-3">
                <div className="hidden grid-cols-[5.5rem_1fr_5rem_5.5rem_6.5rem] gap-x-3 border-b border-background/15 px-4 py-2 text-[11px] tracking-widest uppercase opacity-60 sm:grid">
                    <span>ID</span>
                    <span>Name</span>
                    <span>Month</span>
                    <span>Status</span>
                    <span className="text-right">Budget</span>
                </div>
                {state.filtered.map((p) => (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => state.onSelect(p)}
                        className={cn(
                            "grid w-full cursor-pointer grid-cols-[5.5rem_1fr_6.5rem] items-baseline gap-x-3 px-4 py-2 text-left transition-colors hover:bg-background/10 sm:grid-cols-[5.5rem_1fr_5rem_5.5rem_6.5rem]",
                            p.id === state.selected &&
                                "bg-background/15 hover:bg-background/20",
                        )}
                    >
                        <span className="opacity-60">{p.id}</span>
                        <span>
                            {p.id === state.selected && "> "}
                            {p.name}
                        </span>
                        <span className="opacity-60">
                            {formatMonth(p.month)}
                        </span>
                        <span className="hidden sm:block">
                            {statusMeta[p.status].tag}
                        </span>
                        <span className="text-right tabular-nums">
                            €{p.budget.toLocaleString()}
                        </span>
                    </button>
                ))}
                {state.filtered.length === 0 && (
                    <div className="px-4 py-3 opacity-60">
                        no matches — try clearing filters
                    </div>
                )}
            </Panel>
        </div>
    );
}
