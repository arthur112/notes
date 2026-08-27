import { ChartColumn, LayoutDashboard, ReceiptText, type LucideIcon } from 'lucide-react'

export type AppPage = {
  path: string
  name: string
  description?: string
}

export type AppGroup = {
  name: string
  icon: LucideIcon
  children: AppPage[]
}

/**
 * Single source of truth for the navigation tree — top-level suites, each
 * with their pages. Consumed by the dashboard tiles (microApps).
 */
export const appGroups: AppGroup[] = [
  {
    name: 'Acme Suite',
    icon: LayoutDashboard,
    children: [{ path: '/', name: 'Dashboard' }],
  },
  {
    name: 'App 1',
    icon: ReceiptText,
    children: [
      {
        path: '/apps/invoices',
        name: 'Invoices',
        description: 'Browse and select invoices. Publishes an event to the shell on selection.',
      },
    ],
  },
  {
    name: 'App 2',
    icon: ChartColumn,
    children: [
      {
        path: '/apps/reports',
        name: 'Reports',
        description: 'A small chart. Reads the shell event bus to show what other apps did.',
      },
    ],
  },
]

/** The lazily loaded micro-app pages (every group except the shell itself), flattened. */
export const microApps = appGroups.slice(1).flatMap((group) =>
  group.children.map((page) => ({
    path: page.path,
    name: page.name,
    description: page.description ?? '',
    group: group.name,
    icon: group.icon,
  })),
)
