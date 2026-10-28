/**
 * The window a list taller than its panel shows, centered on the cursor and clamped
 * to the list's ends. Both arrow lines are reserved whenever the list is capped,
 * drawn or not, so the window's size stays stable while the cursor moves.
 */
export function windowRange(
  count: number,
  cursor: number,
  capacity: number,
): { capped: boolean; start: number; size: number } {
  const capped = count > capacity
  const size = capped ? capacity - 2 : count
  const start = capped ? Math.max(0, Math.min(cursor - (size >> 1), count - size)) : 0
  return { capped, start, size }
}
