/**
 * Ambient types for the federated remotes. The modules only exist at
 * runtime (served by the remotes' dev servers), so we declare them here.
 */
declare module 'invoices/App' {
  const App: import('react').ComponentType<import('./shell').ShellServices>
  export default App
}

declare module 'reports/App' {
  const App: import('react').ComponentType<import('./shell').ShellServices>
  export default App
}
