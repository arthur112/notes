import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DetailGridProps {
  children: ReactNode
  className?: string
}

export function DetailGrid({ children, className }: DetailGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-3', className)}>
      {children}
    </div>
  )
}
