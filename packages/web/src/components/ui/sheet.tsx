import * as SheetPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** A Radix dialog styled as a sliding panel; used for the navigation on small screens. */
const Sheet = SheetPrimitive.Root
const SheetTrigger = SheetPrimitive.Trigger
const SheetClose = SheetPrimitive.Close
const SheetTitle = SheetPrimitive.Title

function SheetContent({
  side = 'left',
  className,
  children,
  ...props
}: ComponentProps<typeof SheetPrimitive.Content> & { side?: 'left' | 'right' }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'bg-background fixed inset-y-0 z-50 flex h-full w-72 max-w-[85vw] flex-col shadow-xl outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-200',
          side === 'left' &&
            'left-0 border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
          side === 'right' &&
            'right-0 border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-3.5 right-3 rounded-md p-1 opacity-60 outline-none hover:bg-accent hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/40">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  )
}

export { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger }
