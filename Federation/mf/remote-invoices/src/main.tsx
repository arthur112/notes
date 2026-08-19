import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import InvoicesApp from './InvoicesApp'

// Standalone mode: open http://localhost:5001 directly to develop the
// remote without the host.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InvoicesApp
      user={{ name: 'Standalone dev', role: 'dev' }}
      publish={(source, message) => console.log(`[${source}]`, message)}
    />
  </StrictMode>,
)
