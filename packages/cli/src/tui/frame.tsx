import { Box, Text } from 'ink'
import type { ReactNode } from 'react'

import { useTheme } from './fx/context'
import { Paint } from './fx/paint'
import type { Tone } from './theme'

export type FrameTone = 'accent' | 'warn' | 'err'

/**
 * A rounded box whose border is painted on the gradient, column by column: the top
 * and bottom edges are drawn as lines of their own, the sides take the colour of
 * their column. `bright` is the focused look; otherwise the gradient fades towards
 * the background. A warning or error frame is painted in that one colour instead.
 * `title` rides the top edge after `╭─ `, and `titleWidth` says how many columns it takes.
 */
export function GradientFrame({
  width,
  bright = true,
  tone = 'accent',
  title,
  titleWidth = 0,
  children,
  flexGrow,
  paddingX = 0,
}: {
  width: number
  bright?: boolean
  tone?: FrameTone
  title?: ReactNode
  titleWidth?: number
  children?: ReactNode
  flexGrow?: number
  paddingX?: number
}) {
  const theme = useTheme()
  const span = Math.max(2, width)
  const colors =
    tone === 'accent'
      ? theme.gradient(span, bright ? 0 : 0.55)
      : Array.from({ length: span }, () => theme.color(tone as Tone))
  // Without the colour range, a frame that is not focused is the dim attribute, as before Tide.
  const dim = !bright && !theme.rich
  const edge = (left: string, right: string, from: number, fill: number) => (
    <Paint text={`${left}${'─'.repeat(Math.max(0, fill))}${right}`} colors={colors.slice(from)} dimColor={dim} />
  )
  const head = title === undefined ? 0 : titleWidth + 4
  return (
    <Box flexDirection="column" width={span} flexGrow={flexGrow}>
      {title === undefined ? (
        edge('╭', '╮', 0, span - 2)
      ) : (
        <Box>
          <Paint text="╭─ " colors={colors} dimColor={dim} />
          {title}
          {edge(' ', '╮', head - 1, span - head - 1)}
        </Box>
      )}
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="round"
        borderTop={false}
        borderBottom={false}
        borderLeftColor={colors[0]}
        borderRightColor={colors[span - 1]}
        borderDimColor={dim}
        paddingX={paddingX}
      >
        {children}
      </Box>
      {edge('╰', '╯', 0, span - 2)}
    </Box>
  )
}

/** A one-line title on a frame's top edge, bold in the accent. */
export function EdgeTitle({ text }: { text: string }) {
  const theme = useTheme()
  return (
    <Text bold {...theme.tone('fg')}>
      {text}
    </Text>
  )
}
