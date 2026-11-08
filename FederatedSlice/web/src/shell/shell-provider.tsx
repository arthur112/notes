import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import type { User as OidcUser } from "oidc-client-ts";

import { userManager } from "./auth";

export type ShellEvent = { id: number; source: string; message: string; at: Date };

export type User = {
  name: string;
  email: string;
  initials: string;
  /** What the app may do (the access token's scopes). */
  scopes: readonly string[];
  /** What the user may do (Keycloak realm roles, the `role` claim). */
  roles: readonly string[];
};

/** A permission as the API declares it on a route: every scope and every role must be held. */
export type Access = { scopes?: readonly string[]; roles?: readonly string[] };

type Shell = {
  user: User;
  /**
   * Whether the signed-in user may do this. For hiding and disabling only: the API still checks
   * the token on every request (401 / 403).
   */
  can: (access: Access) => boolean;
  signOut: () => void;
  events: ShellEvent[];
  /** Tell the shell (and every other app) something happened. */
  publish: (source: string, message: string) => void;
};

const ShellContext = createContext<Shell | null>(null);

/** The shell's user from the ID token's profile. */
function toUser({ profile, scopes }: OidcUser): User {
  const name = profile.name ?? profile.preferred_username ?? profile.sub;
  const role = profile.role;
  return {
    name,
    email: profile.email ?? "",
    initials: name
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2),
    scopes,
    roles: Array.isArray(role) ? role.map(String) : typeof role === "string" ? [role] : [],
  };
}

let nextId = 1;

/**
 * The services the shell offers its apps: who is signed in (and what they may do) and an event bus.
 * Every app is a chunk of the same build, so they all share this one module
 * instance: a plain React context, no federation contract.
 */
export function ShellProvider({ signedIn, children }: { signedIn: OidcUser; children: ReactNode }) {
  const [events, setEvents] = useState<ShellEvent[]>([]);

  const publish = useCallback((source: string, message: string) => {
    setEvents((prev) => [...prev.slice(-19), { id: nextId++, source, message, at: new Date() }]);
  }, []);

  const shell = useMemo(() => {
    const user = toUser(signedIn);
    const can = ({ scopes = [], roles = [] }: Access) =>
      scopes.every((scope) => user.scopes.includes(scope)) &&
      roles.every((role) => user.roles.includes(role));
    const signOut = () => void userManager().signoutRedirect();
    return { user, can, signOut, events, publish };
  }, [signedIn, events, publish]);
  return <ShellContext value={shell}>{children}</ShellContext>;
}

export function useShell(): Shell {
  const shell = use(ShellContext);
  if (!shell) throw new Error("useShell must be used inside <ShellProvider>");
  return shell;
}
