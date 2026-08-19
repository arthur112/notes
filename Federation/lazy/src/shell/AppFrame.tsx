import { Suspense } from 'react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { ErrorBoundary } from './ErrorBoundary'
import { useShell } from './ShellProvider'

export function AppFrame() {
  const { user, events } = useShell()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const onDashboard = pathname === '/'

  return (
    <div className="frame">
      <header className="topbar">
        <Link to="/" className="brand">
          Acme Suite
        </Link>
        {!onDashboard && (
          <Link to="/" className="back-link">
            ← Dashboard
          </Link>
        )}
        <span className="user">
          {user.name} · {user.role}
        </span>
      </header>
      <main className="content">
        <ErrorBoundary>
          <Suspense fallback={<div className="loading">Loading application…</div>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="eventbar">
        Shell event bus: {events.length === 0 ? 'no events yet' : `${events.length} event(s) — latest: `}
        {events.length > 0 && (
          <em>
            [{events[events.length - 1].source}] {events[events.length - 1].message}
          </em>
        )}
      </footer>
    </div>
  )
}
