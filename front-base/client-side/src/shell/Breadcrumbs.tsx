import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactElement } from "react";

import { useNav, type MicroApp } from "./nav";

// `Link` with `to` widened to `string`: crumb targets come from route metadata
// at runtime, so they can't be narrowed to the registered path union.
const CrumbLink = Link as (
  props: { to: string } & Omit<ComponentProps<"a">, "href">,
) => ReactElement | null;

type Crumb = { label: string; to?: string };

type Trail = { section: string; crumbs: Crumb[] };

/**
 * The trail for a pathname: `section › …crumbs`, where the app crumb links back
 * to its list and every deeper segment (e.g. an order number) is a further,
 * unlinked crumb. Derived from the same route metadata that feeds the sidebar,
 * so adding an app needs no change here.
 */
function buildTrail(pathname: string, microApps: MicroApp[]): Trail {
  if (pathname === "/") return { section: "Platform", crumbs: [{ label: "Dashboard" }] };

  const app = microApps.find(
    (candidate) => pathname === candidate.path || pathname.startsWith(`${candidate.path}/`),
  );
  if (!app) return { section: "Apps", crumbs: [{ label: "Not found" }] };

  const crumbs: Crumb[] = [{ label: app.name, to: app.path }];
  const rest = pathname.slice(app.path.length).replace(/^\/+/, "");
  for (const segment of rest ? rest.split("/") : []) {
    crumbs.push({ label: decodeURIComponent(segment) });
  }
  return { section: "Apps", crumbs };
}

/**
 * Shell breadcrumb — the primary way back from a record page to its list. The
 * last crumb is the current location (never a link); every earlier one is a
 * link, so `/apps/orders-ops/ORD-100123` offers a one-click return to the desk.
 */
export function Breadcrumbs() {
  const { microApps } = useNav();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { section, crumbs } = buildTrail(pathname, microApps);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <span className="hidden text-muted-foreground md:block">{section}</span>
      <ChevronRight className="hidden size-3.5 text-muted-foreground md:block" aria-hidden />
      <ol className="flex items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const current = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}:${index}`} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />}
              {current || !crumb.to ? (
                <span aria-current={current ? "page" : undefined} className="font-medium">
                  {crumb.label}
                </span>
              ) : (
                <CrumbLink
                  to={crumb.to}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </CrumbLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
