import { Suspense, lazy, useCallback, useState } from 'react'
import type { RemoteComponent, ShellServices } from './shell'
import { ErrorBoundary } from './ErrorBoundary'

type RemoteName = 'invoices' | 'reports'

// React.lazy only triggers the import when the component is first rendered,
// so clicking a tile is what downloads the remote's bundle.
const remotes: Record<RemoteName, () => Promise<{ default: RemoteComponent }>> = {
  invoices: () => import('invoices/App'),
  reports: () => import('reports/App'),
}

const cache = new Map<RemoteName, RemoteComponent>()

function getRemote(name: RemoteName): RemoteComponent {
  let component = cache.get(name)
  if (!component) {
    component = lazy(remotes[name]) as RemoteComponent
    cache.set(name, component)
  }
  return component
}

type ShellEvent = { id: number; source: string; message: string }

let nextId = 1

export function Dashboard() {
  const [active, setActive] = useState<RemoteName | null>(null)
  const [events, setEvents] = useState<ShellEvent[]>([])
  const [user] = useState<ShellServices['user']>({ name: 'Ada Lovelace', role: 'admin' })

  const publish = useCallback((source: string, message: string) => {
    setEvents((prev) => [...prev.slice(-19), { id: nextId++, source, message }])
  }, [])

  const ActiveApp = active ? getRemote(active) : null

  return (
    <div className="frame">
      <header className="topbar">
        <span className="brand">Acme Suite (module federation)</span>
        {active && (
          <button className="back-link" onClick={() => setActive(null)}>
            ← Dashboard
          </button>
        )}
        <span className="user">
          {user.name} · {user.role}
        </span>
      </header>
      <main className="content">
        {ActiveApp ? (
          <ErrorBoundary onReset={() => setActive(null)}>
            <Suspense fallback={<div className="loading">Loading remote application…</div>}>
              <ActiveApp user={user} publish={publish} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <div>
            <h1>Welcome, {user.name}</h1>
            <p className="hint">
              Each tile downloads a separately-built remote bundle at runtime — the remotes must be
              running on ports 5001/5002. Watch the Network tab for remoteEntry.js.
            </p>
            <div className="tiles">
              <button className="tile" onClick={() => setActive('invoices')}>
                <h2>Invoices</h2>
                <p>Served by remote-invoices (port 5001).</p>
              </button>
              <button className="tile" onClick={() => setActive('reports')}>
                <h2>Reports</h2>
                <p>Served by remote-reports (port 5002).</p>
              </button>
            </div>
          </div>
        )}
      </main>
      <footer className="eventbar">
        Shell event bus:{' '}
        {events.length === 0 ? (
          'no events yet'
        ) : (
          <em>
            [{events[events.length - 1].source}] {events[events.length - 1].message}
          </em>
        )}
      </footer>
    </div>
  )
}
