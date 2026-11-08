import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

export type ShellEvent = { id: number; source: string; message: string; at: Date };

export type User = { name: string; email: string; initials: string };

type Shell = {
  user: User;
  events: ShellEvent[];
  /** Tell the shell (and every other app) something happened. */
  publish: (source: string, message: string) => void;
};

const ShellContext = createContext<Shell | null>(null);

const user: User = { name: "Ada Lovelace", email: "ada@acme.example", initials: "AL" };

let nextId = 1;

/**
 * The services the shell offers its apps: who is signed in and an event bus.
 * Every app is a chunk of the same build, so they all share this one module
 * instance: a plain React context, no federation contract.
 */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ShellEvent[]>([]);

  const publish = useCallback((source: string, message: string) => {
    setEvents((prev) => [...prev.slice(-19), { id: nextId++, source, message, at: new Date() }]);
  }, []);

  const shell = useMemo(() => ({ user, events, publish }), [events, publish]);
  return <ShellContext value={shell}>{children}</ShellContext>;
}

export function useShell(): Shell {
  const shell = use(ShellContext);
  if (!shell) throw new Error("useShell must be used inside <ShellProvider>");
  return shell;
}
