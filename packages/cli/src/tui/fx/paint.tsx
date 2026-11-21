import { Text } from 'ink'

import type { FillProps } from '../theme'
import { mix } from '../theme'
import { useTheme } from './context'

/** One run of cells that share a colour. */
interface Run {
  text: string
  color?: string
  backgroundColor?: string
}

/** Groups neighbouring cells of the same colours, so a gradient line is a handful of spans, not one per cell. */
function runs(
  cells: readonly string[],
  colors: readonly (string | undefined)[],
  backgrounds?: readonly (string | undefined)[],
): Run[] {
  const result: Run[] = []
  for (const [index, cell] of cells.entries()) {
    const color = colors[index]
    const backgroundColor = backgrounds?.[index]
    const last = result.at(-1)
    if (last && last.color === color && last.backgroundColor === backgroundColor) last.text += cell
    else result.push({ text: cell, color, backgroundColor })
  }
  return result
}

/**
 * Text painted cell by cell: `colors[i]` for the i-th character, and optionally a
 * background per cell. Undefined colours fall back to the terminal's own.
 */
export function Paint({
  text,
  colors,
  backgrounds,
  bold,
  dimColor,
  inverse,
}: {
  text: string
  colors: readonly (string | undefined)[]
  backgrounds?: readonly (string | undefined)[]
  bold?: boolean
  dimColor?: boolean
  inverse?: boolean
}) {
  const cells = Array.from(text)
  return (
    <Text bold={bold} dimColor={dimColor} inverse={inverse}>
      {runs(cells, colors, backgrounds).map((run, index) => (
        <Text key={index} color={run.color} backgroundColor={run.backgroundColor}>
          {run.text}
        </Text>
      ))}
    </Text>
  )
}

/** Columns a sweep's highlight band covers. */
const BAND = 4

/**
 * Where a sweep's band sits on `frame` of `frames`: it enters left of the text and
 * leaves right of it, so the first and last frames show the text untouched.
 */
export function sweepColumn(frame: number, frames: number, width: number): number {
  return Math.round(-BAND + ((width + 2 * BAND) * frame) / Math.max(1, frames - 1))
}

/**
 * Text on the theme's gradient, spread over `span` columns (the text's own width by
 * default, so stacked rows can share one gradient). `sweep` is the highlight band's
 * column while a sweep plays; 16-colour and colourless terminals never show it — a
 * sweep there would be colour only.
 */
export function GradientText({
  text,
  span,
  sweep,
  fade = 0,
  bold,
}: {
  text: string
  span?: number
  sweep?: number
  fade?: number
  bold?: boolean
}) {
  const theme = useTheme()
  const width = Array.from(text).length
  const columns = theme.gradient(Math.max(span ?? width, width), fade)
  const colors = columns.slice(0, width).map((color, column) => {
    if (!theme.rich || color === undefined || sweep === undefined) return color
    const distance = Math.abs(column - sweep)
    return distance < BAND / 2 + 1 ? mix(color, theme.palette.glow, distance === 0 ? 0.7 : 0.4) : color
  })
  return <Paint text={text} colors={colors} bold={bold} />
}

/**
 * A chip filled with the gradient (or the error colour): the focused button, the
 * selected nav row, the header badge. Without colour it is inverse video.
 */
export function FillText({
  text,
  kind = 'accent',
  bold = true,
}: {
  text: string
  kind?: 'accent' | 'err'
  bold?: boolean
}) {
  const theme = useTheme()
  const fill: FillProps = theme.fill(kind)
  if (!theme.rich || kind === 'err')
    return (
      <Text color={fill.color} backgroundColor={fill.backgroundColor} inverse={fill.inverse} bold={bold}>
        {text}
      </Text>
    )
  const width = Array.from(text).length
  return (
    <Paint
      text={text}
      colors={Array.from({ length: width }, () => fill.color)}
      backgrounds={theme.gradient(width)}
      bold={bold}
    />
  )
}
