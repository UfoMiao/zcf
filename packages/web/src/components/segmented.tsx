import { cn } from '@/lib/utils'

export interface SegmentOption {
  value: string
  label: string
}

/** A compact two-or-three-way switch, shown as one pill of pressed buttons. */
export function Segmented({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  options: readonly SegmentOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  'aria-label': string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('bg-muted inline-flex rounded-md p-0.5', className)}>
      {options.map(option => {
        const on = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-6 min-w-8 rounded-[5px] px-2 text-xs font-medium outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring/40',
              on ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
