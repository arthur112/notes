import { useState } from 'react'
import { useShell } from '../../shell/ShellProvider'

type Invoice = { id: string; customer: string; amount: number; status: 'paid' | 'open' | 'overdue' }

const invoices: Invoice[] = [
  { id: 'INV-001', customer: 'Globex', amount: 1200, status: 'paid' },
  { id: 'INV-002', customer: 'Initech', amount: 8450, status: 'open' },
  { id: 'INV-003', customer: 'Umbrella', amount: 399, status: 'overdue' },
  { id: 'INV-004', customer: 'Hooli', amount: 15900, status: 'open' },
]

export function App() {
  const { publish } = useShell()
  const [selected, setSelected] = useState<string | null>(null)

  const select = (invoice: Invoice) => {
    setSelected(invoice.id)
    publish('invoices', `Selected ${invoice.id} (${invoice.customer}, €${invoice.amount})`)
  }

  return (
    <div>
      <h1>Invoices</h1>
      <table>
        <thead>
          <tr>
            <th>Id</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className={inv.id === selected ? 'selected' : undefined}
              onClick={() => select(inv)}
            >
              <td>{inv.id}</td>
              <td>{inv.customer}</td>
              <td>€{inv.amount.toLocaleString()}</td>
              <td>{inv.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">Click a row — the shell footer shows the event this app publishes.</p>
    </div>
  )
}
