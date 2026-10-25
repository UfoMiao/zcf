import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative flex w-full items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-px [&>svg]:text-current',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        info: 'bg-card text-card-foreground [&>svg]:text-primary',
        warning: 'border-warning/40 bg-warning/5 text-warning [&>svg]:text-warning',
        destructive: 'border-destructive/40 bg-destructive/5 text-destructive [&>svg]:text-destructive',
        success: 'border-success/40 bg-success/5 text-success [&>svg]:text-success',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Alert({ className, variant, ...props }: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('min-h-4 font-medium leading-relaxed', className)} {...props} />
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('text-muted-foreground text-xs leading-relaxed', className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
