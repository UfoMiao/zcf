import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />
}

export { Skeleton }
