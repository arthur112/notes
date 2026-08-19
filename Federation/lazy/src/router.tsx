import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { AppFrame } from './shell/AppFrame'
import { Dashboard } from './shell/Dashboard'

const rootRoute = createRootRoute({ component: AppFrame })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
})

// Code-based lazy routes: the component — and therefore the whole
// micro-app module graph behind it — is only fetched by the browser
// when the route is first matched. Vite emits one chunk per app.
const invoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/apps/invoices',
  component: lazyRouteComponent(() => import('./apps/invoices/InvoicesApp'), 'App'),
})

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/apps/reports',
  component: lazyRouteComponent(() => import('./apps/reports/ReportsApp'), 'App'),
})

const routeTree = rootRoute.addChildren([indexRoute, invoicesRoute, reportsRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
