import { EditorialSection, EditorialWidget } from "./EditorialStats";
import { ProjectsTable } from "./ProjectsTable";
import { ProjectsToolbar } from "./ProjectsToolbar";
import { eur, revenue, sections, type ShowcaseState } from "./data";

/** Design 1 — the current editorial take: typography only, no card chrome. */
export function EditorialShowcase({ state }: { state: ShowcaseState }) {
    return (
        <div>
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

            <ProjectsToolbar state={state} />
            <ProjectsTable state={state} />
        </div>
    );
}
