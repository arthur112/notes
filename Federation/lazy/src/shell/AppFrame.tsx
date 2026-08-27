import { Suspense } from 'react'
import { Outlet } from '@tanstack/react-router'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ErrorBoundary } from './ErrorBoundary'
import { useShell } from './ShellProvider'

export function AppFrame() {
  const { events } = useShell()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center px-4">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
          </header>
          <main className="flex-1 px-6 py-10">
            <ErrorBoundary>
              <Suspense fallback={<div className="loading">Loading application…</div>}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
          <footer className="border-t border-border/60 px-6 py-3 font-mono text-xs text-muted-foreground">
            {events.length === 0 ? (
              'event bus · idle'
            ) : (
              <>
                event bus · {events.length} event(s) · latest: [{events[events.length - 1].source}]{' '}
                {events[events.length - 1].message}
              </>
            )}
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
