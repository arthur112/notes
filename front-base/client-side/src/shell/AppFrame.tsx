import { Suspense, useEffect, useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/shared/components/ui/sidebar";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { AppSidebar } from "./app-sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ErrorBoundary } from "./ErrorBoundary";
import { useShell } from "./ShellProvider";

export function AppFrame() {
  const { events } = useShell();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 text-muted-foreground" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumbs />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDark((d) => !d)}
                aria-label="Toggle theme"
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <ErrorBoundary>
              <Suspense fallback={<div className="loading">Loading application…</div>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
          <footer className="border-t border-border/60 px-6 py-3 font-mono text-xs text-muted-foreground">
            {events.length === 0 ? (
              "event bus · idle"
            ) : (
              <>
                event bus · {events.length} event(s) · latest: [{events[events.length - 1].source}]{" "}
                {events[events.length - 1].message}
              </>
            )}
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
