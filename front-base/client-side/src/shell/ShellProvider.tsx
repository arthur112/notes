import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type ShellEvent = {
  id: number;
  source: string;
  message: string;
  at: Date;
};

export type ShellUser = {
  name: string;
  role: string;
};

type Shell = {
  user: ShellUser;
  events: ShellEvent[];
  publish: (source: string, message: string) => void;
};

const ShellContext = createContext<Shell | null>(null);

let nextEventId = 1;

/**
 * Shared shell services. Every app is a chunk of the same build, so they all
 * import this one module instance — context and module state are shared for
 * free. The event bus is how apps talk to each other without coupling.
 */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [user] = useState<ShellUser>({ name: "Alex Chen", role: "operations" });
  const [events, setEvents] = useState<ShellEvent[]>([]);

  const publish = useCallback((source: string, message: string) => {
    setEvents((prev) => [
      ...prev.slice(-19),
      { id: nextEventId++, source, message, at: new Date() },
    ]);
  }, []);

  return (
    <ShellContext.Provider value={{ user, events, publish }}>{children}</ShellContext.Provider>
  );
}

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useShell must be used inside <ShellProvider>");
  return shell;
}
