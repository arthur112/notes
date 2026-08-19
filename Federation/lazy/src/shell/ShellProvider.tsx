import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

export type ShellEvent = {
  id: number
  source: string
  message: string
  at: Date
}

export type User = {
  name: string
  role: string
}

type Shell = {
  user: User
  events: ShellEvent[]
  publish: (source: string, message: string) => void
}

const ShellContext = createContext<Shell | null>(null)

let nextId = 1

/**
 * Shared shell services. Because every micro-app is just another chunk of
 * the same build, they all import this one module instance — context and
 * module state are shared for free, with no federation configuration.
 */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User>({ name: 'Ada Lovelace', role: 'admin' })
  const [events, setEvents] = useState<ShellEvent[]>([])

  const publish = useCallback((source: string, message: string) => {
    setEvents((prev) => [...prev.slice(-19), { id: nextId++, source, message, at: new Date() }])
  }, [])

  return <ShellContext.Provider value={{ user, events, publish }}>{children}</ShellContext.Provider>
}

export function useShell(): Shell {
  const shell = useContext(ShellContext)
  if (!shell) throw new Error('useShell must be used inside <ShellProvider>')
  return shell
}
