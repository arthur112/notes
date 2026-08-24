import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface FormSectionProps {
  title: string
  description?: string
  muted?: boolean
  className?: string
  children: ReactNode
}

export function FormSection({ title, description, muted, className, children }: FormSectionProps) {
  return (
    <Card className={cn(muted && 'text-muted-foreground', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
