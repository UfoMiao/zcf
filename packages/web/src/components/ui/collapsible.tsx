import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'
import { ChevronDownIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const Collapsible = CollapsiblePrimitive.Root
const CollapsibleContent = CollapsiblePrimitive.Content

/** The always-visible header row of a collapsible section; the chevron turns when open. */
function CollapsibleTrigger({ className, children, ...props }: ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn('group flex flex-1 items-center gap-1.5 text-left text-[13px] font-medium', className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="text-muted-foreground size-4 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsiblePrimitive.Trigger>
  )
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger }
