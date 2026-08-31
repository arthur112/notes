import { Suspense, useEffect, useState } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Moon, Search, Sun } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNav, type MicroApp } from "./nav";
import { ErrorBoundary } from "./ErrorBoundary";
import { useShell } from "./ShellProvider";

/** Breadcrumb labels for the current route — shell pages vs. micro-apps. */
function pageMeta(
  pathname: string,
  microApps: MicroApp[],
): { section: string; title: string } {
  if (pathname === "/") return { section: "Platform", title: "Dashboard" };
  const app = microApps.find((a) => a.path === pathname);
  return { section: "Apps", title: app?.name ?? "Not found" };
}

export function AppFrame() {
  const { events } = useShell();
  const { microApps } = useNav();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const meta = pageMeta(pathname, microApps);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 text-muted-foreground" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <nav className="flex items-center gap-1.5 text-sm">
                <span className="hidden text-muted-foreground md:block">
                  {meta.section}
                </span>
                <ChevronRight className="hidden size-3.5 text-muted-foreground md:block" />
                <span className="font-medium">{meta.title}</span>
              </nav>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search…" className="w-56 pl-8" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDark((d) => !d)}
                aria-label="Toggle theme"
              >
                {dark ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <ErrorBoundary>
              <Suspense
                fallback={<div className="loading">Loading application…</div>}
              >
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
          <footer className="border-t border-border/60 px-6 py-3 font-mono text-xs text-muted-foreground">
            {events.length === 0 ? (
              "event bus · idle"
            ) : (
              <>
                event bus · {events.length} event(s) · latest: [
                {events[events.length - 1].source}]{" "}
                {events[events.length - 1].message}
              </>
            )}
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
