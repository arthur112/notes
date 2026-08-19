import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { ShellProvider } from './shell/ShellProvider'
import { router } from './router'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShellProvider>
      <RouterProvider router={router} />
    </ShellProvider>
  </StrictMode>,
)
