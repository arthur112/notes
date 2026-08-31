import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useNav } from "./nav";
import { useShell } from "./ShellProvider";

export function Dashboard() {
  const { user } = useShell();
  const { microApps } = useNav();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {user.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Each app below loads its bundle on first click — watch the Network tab
        (or the build output) to see one chunk per app.
      </p>
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {microApps.map((app) => (
          <Link
            key={app.path}
            to={app.path}
            className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <app.icon className="size-4" />
              </div>
              <ArrowRight className="size-4 -translate-x-1 text-secondary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
            </div>
            <h2 className="mt-4 font-medium tracking-tight">{app.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {app.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
