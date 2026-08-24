import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { ProductDetailPage } from './features/products/ProductDetailPage'
import { ProductFormPage } from './features/products/ProductFormPage'
import { ProductListPage } from './features/products/ProductListPage'

const rootRoute = createRootRoute({
  component: () => (
    <div className="mx-auto max-w-6xl p-6">
      <Outlet />
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/products' })
  },
})

const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products',
  component: ProductListPage,
})

const productNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products/new',
  component: ProductFormPage,
})

const productDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products/$productId',
  component: ProductDetailPage,
})

const productEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products/$productId/edit',
  component: ProductFormPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  productsRoute,
  productNewRoute,
  productDetailRoute,
  productEditRoute,
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
