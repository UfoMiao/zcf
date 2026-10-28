import { Box, Text } from 'ink'

import type { Translate } from '../i18n'

/** Display width of a string, where CJK and full-width characters count as two. */
function displayWidth(text: string): number {
  let width = 0
  for (const char of text) {
    if (/[一-鿿！-｠　-〿]/.test(char)) width += 2
    else width += 1
  }
  return width
}

function padTo(text: string, target: number): string {
  // Trim first: a subtitle wider than its slot would push the box border out of line.
  let trimmed = text
  while (displayWidth(trimmed) > target) trimmed = trimmed.slice(0, -1)
  return trimmed + ' '.repeat(Math.max(0, target - displayWidth(trimmed)))
}

const LINE = {
  top: '╔════════════════════════════════════════════════════════════════╗',
  blank: '║                                                                ║',
  art: [
    '║   ███████╗  ██████╗ ███████╗                                   ║',
    '║       ██╔╝  ██╔═══╝  ██╔═══╝                                   ║',
    '║      ██╔╝   ██║      █████╗                                    ║',
    '║    ██╔╝     ██║      ██╔══╝                                    ║',
    '║   ███████╗  ╚██████╗ ██║                                       ║',
  ],
  underArt: '║   ╚══════╝   ╚═════╝ ╚═╝        ',
  titleIndent: '║   ',
  bottom: '╚════════════════════════════════════════════════════════════════╝',
} as const

/**
 * Rows the whole app needs around its boxed banner: the box's 11 lines, the status
 * row, a panel tall enough for its border and a window of nav entries, the key bar
 * and a transient status message — plus a row of slack, since the measured minimum
 * drifts by a line between platforms. Below that yoga starts squeezing the box's top
 * line away, so the banner folds to one line and a short terminal still holds the app whole.
 */
export const FULL_BANNER_ROWS = 23

/**
 * The ZCF banner, carried over from v3: block letters in a box, with the localized
 * subtitle and the tagline inside. In a terminal without room for the box (`compact`),
 * it folds down to the one line that still says what this is.
 */
export function Banner({ t, compact = false }: { t: Translate; compact?: boolean }) {
  const subtitle = padTo(t('tui.bannerSubtitle'), 30)
  const title = padTo('Zero-Config Code Flow', 60)
  if (compact) {
    return (
      <Text bold color="cyan">
        {`ZCF · ${t('tui.bannerSubtitle')}`}
      </Text>
    )
  }
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {LINE.top}
      </Text>
      <Text bold color="cyan">
        {LINE.blank}
      </Text>
      {LINE.art.map(line => (
        <Text key={line} bold color="cyan">
          {line}
        </Text>
      ))}
      <Text bold color="cyan">
        {LINE.underArt}
        <Text color="gray">{subtitle}</Text>
        {' ║'}
      </Text>
      <Text bold color="cyan">
        {LINE.blank}
      </Text>
      <Text bold color="cyan">
        {LINE.titleIndent}
        <Text bold color="white">
          {title}
        </Text>
        {' ║'}
      </Text>
      <Text bold color="cyan">
        {LINE.blank}
      </Text>
      <Text bold color="cyan">
        {LINE.bottom}
      </Text>
    </Box>
  )
}
