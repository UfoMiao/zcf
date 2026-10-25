import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('text-foreground text-[13px] leading-none font-medium select-none', className)}
      {...props}
    />
  )
}

export { Label }
