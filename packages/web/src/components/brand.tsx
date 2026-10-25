import { cn } from '@/lib/utils'

/**
 * The wordmark: lowercase mono with a block cursor, the terminal ZCF comes from.
 * The cursor blinks once when the app loads, and not at all for reduced motion.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('text-primary font-mono text-[15px] font-semibold tracking-tight select-none', className)}>
      zcf
      <span className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] animate-[cursor_1.1s_step-end_3] bg-current" />
    </span>
  )
}
