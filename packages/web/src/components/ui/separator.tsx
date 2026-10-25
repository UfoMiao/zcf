import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn('bg-border shrink-0', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)}
      {...props}
    />
  )
}

export { Separator }
