import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind classes joined, with later classes winning over earlier conflicts. */
export function cn(...inputs: Parameters<typeof clsx>): string {
  return twMerge(clsx(inputs))
}
