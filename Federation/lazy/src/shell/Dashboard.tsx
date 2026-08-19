import { Link } from '@tanstack/react-router'
import { useShell } from './ShellProvider'

const apps = [
  {
    path: '/apps/invoices',
    name: 'Invoices',
    description: 'Browse and select invoices. Publishes an event to the shell on selection.',
  },
  {
    path: '/apps/reports',
    name: 'Reports',
    description: 'A small chart. Reads the shell event bus to show what other apps did.',
  },
] as const

export function Dashboard() {
  const { user } = useShell()

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p className="hint">
        Each tile below loads its application bundle on first click — watch the Network tab (or the
        build output) to see one chunk per app.
      </p>
      <div className="tiles">
        {apps.map((app) => (
          <Link key={app.path} to={app.path} className="tile">
            <h2>{app.name}</h2>
            <p>{app.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
