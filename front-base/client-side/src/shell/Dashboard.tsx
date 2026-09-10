import { KpiGroupCard } from "@/shared/components/kpi-group-card";
import { ErrorPanel } from "@/shared/components/ui/data-states";
import { PageHeader } from "@/shared/components/ui/page-header";

import { useSalesKpis } from "./use-sales-kpis";

/**
 * Shell dashboard — sales grouped into four semantic tiles (revenue, volume,
 * customers, fulfilment), each year over year. App selection lives in the
 * sidebar header (`AppSwitcher`), not here.
 */

export function Dashboard() {
  const { groups, currentYear, previousYear, isError, refetch } = useSalesKpis();

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader title="Dashboard" description="Year-over-year sales performance." />
        <div className="mt-6">
          <ErrorPanel
            title="Could not load sales KPIs"
            description="The mock API did not answer. Try again."
            onRetry={refetch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Dashboard"
        description={`Sales grouped by theme, year to date in ${currentYear} vs the same period in ${previousYear}.`}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <KpiGroupCard
            key={group.key}
            title={group.title}
            icon={group.icon}
            headline={group.headline}
            rows={group.rows}
            progress={group.progress}
            comparison={`vs ${previousYear}`}
          />
        ))}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Each tile is one semantic group of metrics, all aggregated server-side by{" "}
        <code className="rounded bg-muted px-1 py-0.5">GET /api/orders/aggregate</code>. The
        headline meter scales this year against last year (the tick) and states the change in the
        metric&rsquo;s own unit, and every row carries its own year-over-year delta. The two year
        windows are just Gridify filters (
        <code className="rounded bg-muted px-1 py-0.5">createdAt&gt;=… ,createdAt&lt;…</code>) over
        the shared orders domain, so the dashboard talks to the same contract as the apps.
      </p>
    </div>
  );
}
