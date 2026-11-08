import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { useMicroApps } from "./nav";
import { useShell } from "./shell-provider";

/** The landing page: one tile per app, opening its first page. A first visit downloads that page's chunk. */
export function Dashboard() {
  const { user } = useShell();
  const apps = useMicroApps();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Each page of an app loads its code on first open: watch the Network tab (or the build
        output) for one chunk per page.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {apps.map((app) => (
          <Link
            key={app.path}
            to={app.pages[0]?.path ?? app.path}
            className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <app.icon className="size-4" />
              </div>
              <ArrowRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </div>
            <h2 className="mt-4 font-medium tracking-tight">{app.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{app.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
