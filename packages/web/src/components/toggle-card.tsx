import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Checkbox } from './ui/checkbox'

/**
 * One checkbox card, the shared shape of every toggle grid: the skills catalog, the
 * workflow presets, agents, styles and a bundle's picks. A picked card highlights.
 */
export function ToggleCard({
  title,
  detail,
  on,
  onToggle,
}: {
  /** The main line; monospaced when it names an id, plain text when it is a title. */
  title: ReactNode
  /** A quiet second line, such as a description or the ids a preset bundles. */
  detail?: ReactNode
  on: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition-colors',
        'outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
        on ? 'border-primary/50 bg-primary/[0.04]' : 'hover:border-input',
      )}
    >
      <Checkbox checked={on} onCheckedChange={onToggle} />
      <span className="flex min-w-0 flex-col gap-0.5">
        {title}
        {detail}
      </span>
    </label>
  )
}
