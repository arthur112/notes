/**
 * The shell's contract, duplicated from host/src/shell.ts.
 * In a real multi-repo setup this would come from a shared types package.
 */
export type ShellServices = {
  user: { name: string; role: string }
  publish: (source: string, message: string) => void
}

const data = [
  { label: 'Q1', value: 42 },
  { label: 'Q2', value: 68 },
  { label: 'Q3', value: 55 },
  { label: 'Q4', value: 91 },
]

export default function ReportsApp({ user }: ShellServices) {
  const max = Math.max(...data.map((d) => d.value))

  return (
    <div>
      <h1>Reports</h1>
      <p style={{ color: '#627d98', fontSize: '0.9rem' }}>
        Rendered by the reports remote for {user.name} ({user.role}).
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '1.5rem',
          height: '200px',
          padding: '1rem',
          background: '#fff',
          border: '1px solid #d9e2ec',
          borderRadius: '8px',
        }}
      >
        {data.map((d) => (
          <div
            key={d.label}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}
          >
            <div
              style={{
                width: '48px',
                height: `${(d.value / max) * 160}px`,
                background: '#2680c2',
                borderRadius: '4px 4px 0 0',
              }}
            />
            <span>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
