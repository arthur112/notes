import { cn } from "@/lib/utils";

export type SectionLine = { label: string; value: string };

export type EditorialWidgetProps = {
        label: string;
        current: number;
        previous: number;
        format?: (value: number) => string;
};

function editorialDelta(current: number, previous: number) {
        const delta = ((current - previous) / previous) * 100;
        return { delta, up: delta >= 0 };
}

/** A stat widget: no card chrome, typography only. */
export function EditorialWidget({
        label,
        current,
        previous,
        format = (n) => n.toLocaleString(),
}: EditorialWidgetProps) {
        const { delta, up } = editorialDelta(current, previous);

        return (
                <div className="border-t-2 border-foreground pt-3">
                        <div className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                                {label}
                        </div>
                        <div className="mt-2 text-4xl font-semibold tracking-tight tabular-nums">
                                {format(current)}
                        </div>
                        <div className="mt-1.5 text-sm">
                                <span
                                        className={cn(
                                                "font-medium",
                                                up
                                                        ? "text-primary"
                                                        : "text-destructive",
                                        )}
                                >
                                        {up ? "▲" : "▼"} {up ? "+" : ""}
                                        {delta.toFixed(1)}%
                                </span>{" "}
                                <span className="text-muted-foreground">
                                        vs {new Date().getFullYear() - 1} (
                                        {format(previous)})
                                </span>
                        </div>
                </div>
        );
}

/** A section block: thin rule + dashed leaders, no box. */
export function EditorialSection({
        title,
        lines,
}: {
        title: string;
        lines: SectionLine[];
}) {
        return (
                <div className="border-t-2 border-foreground pt-3">
                        <div className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                                {title}
                        </div>
                        <dl className="mt-2">
                                {lines.map((line) => (
                                        <div
                                                key={line.label}
                                                className="flex items-baseline justify-between gap-2 border-b border-dashed border-border py-2 first:pt-0 last:border-b-0 last:pb-0"
                                        >
                                                <dt className="text-sm text-muted-foreground">
                                                        {line.label}
                                                </dt>
                                                <dd className="text-sm font-medium tabular-nums">
                                                        {line.value}
                                                </dd>
                                        </div>
                                ))}
                        </dl>
                </div>
        );
}
