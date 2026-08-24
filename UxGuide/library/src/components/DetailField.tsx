import type { ReactNode } from 'react'

export interface DetailFieldProps {
  label: string
  value?: ReactNode
}

export function DetailField({ label, value }: DetailFieldProps) {
  const empty = value === undefined || value === null || value === ''
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm break-words">{empty ? '—' : value}</div>
    </div>
  )
}
