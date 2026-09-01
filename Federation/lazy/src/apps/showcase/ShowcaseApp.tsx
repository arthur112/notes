import type { ReactNode } from "react";

import { useShowcase } from "./data";
import { EditorialShowcase } from "./EditorialShowcase";
import { CardShowcase } from "./CardShowcase";
import { BentoShowcase } from "./BentoShowcase";
import { TerminalShowcase } from "./TerminalShowcase";
import { SoftShowcase } from "./SoftShowcase";

/**
 * A stacked comparison of five design takes on the same page: identical
 * data, filters and shell event — only the visual language differs.
 */
function DesignBlock({
    name,
    note,
    children,
}: {
    name: string;
    note: string;
    children: ReactNode;
}) {
    return (
        <section className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
                <div className="text-base font-semibold tracking-tight">
                    {name}
                </div>
                <div className="text-sm text-muted-foreground">{note}</div>
            </div>
            <div className="mt-5">{children}</div>
        </section>
    );
}

export function App() {
    const state = useShowcase();

    return (
        <div>
            <h1>Components</h1>
            <p className="hint max-w-2xl">
                Five takes on the same page — identical data, filters and shell
                event, different visual language. The search bar and active
                filters are shared, so a filter applied in one design shows up
                in all five. Click a row anywhere; the shell footer shows the
                event this app publishes.
            </p>

            <DesignBlock
                name="1 · Editorial — current"
                note="Typography only, no card chrome"
            >
                <EditorialShowcase state={state} />
            </DesignBlock>

            <DesignBlock
                name="2 · Dashboard cards"
                note="Classic shadcn: icon stat cards + section cards"
            >
                <CardShowcase state={state} />
            </DesignBlock>

            <DesignBlock
                name="3 · Bento grid"
                note="Rounded tiles of varying spans, projects as cards"
            >
                <BentoShowcase state={state} />
            </DesignBlock>

            <DesignBlock
                name="4 · Terminal"
                note="Inverted mono panels, prompt lines, dot leaders"
            >
                <TerminalShowcase state={state} />
            </DesignBlock>

            <DesignBlock
                name="5 · Soft UI"
                note="Chrome-free rounded cards, pill chips, muted statuses"
            >
                <SoftShowcase state={state} />
            </DesignBlock>
        </div>
    );
}
