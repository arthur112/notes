import { useShell } from '../../shell/ShellProvider'

const data = [
  { label: 'Q1', value: 42 },
  { label: 'Q2', value: 68 },
  { label: 'Q3', value: 55 },
  { label: 'Q4', value: 91 },
]

export function App() {
  const { events } = useShell()
  const otherAppEvents = events.filter((e) => e.source !== 'reports')
  const max = Math.max(...data.map((d) => d.value))

  return (
    <div>
      <h1>Reports</h1>
      <div className="chart">
        {data.map((d) => (
          <div key={d.label} className="bar-col">
            <div className="bar" style={{ height: `${(d.value / max) * 160}px` }} />
            <span>{d.label}</span>
          </div>
        ))}
      </div>
      <h2>What other apps did (via the shell event bus)</h2>
      {otherAppEvents.length === 0 ? (
        <p className="hint">Nothing yet — open Invoices and select a row, then come back.</p>
      ) : (
        <ul className="event-list">
          {otherAppEvents.map((e) => (
            <li key={e.id}>
              [{e.source}] {e.message} — {e.at.toLocaleTimeString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
