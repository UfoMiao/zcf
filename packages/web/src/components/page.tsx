import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** What a page shows when it has nothing yet: one quiet line and the way out of it. */
export function EmptyState({
  icon,
  title,
  children,
  actions,
  className,
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center', className)}
    >
      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full [&>svg]:size-5">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      {children && <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">{children}</p>}
      {actions && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  )
}

/** Every page's heading: title, one-line intro on the left, actions on the right. */
export function PageHeader({
  title,
  intro,
  actions,
  className,
  ...rest
}: ComponentProps<'div'> & { title: string; intro?: string; actions?: ReactNode }) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-3', className)} {...rest}>
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {intro && <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{intro}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
