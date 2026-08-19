import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ReportsApp from './ReportsApp'

// Standalone mode: open http://localhost:5002 directly to develop the
// remote without the host.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReportsApp
      user={{ name: 'Standalone dev', role: 'dev' }}
      publish={(source, message) => console.log(`[${source}]`, message)}
    />
  </StrictMode>,
)
