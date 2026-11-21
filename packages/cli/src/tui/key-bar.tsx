import { Box, Text } from 'ink'

import { useTheme } from './fx/context'

/**
 * One `key action` pair of the bottom bar: the key as a chip — the chip colour with the
 * accent in bold, or inverse video without colour — and the action dimmed.
 */
function Pair({ pair }: { pair: string }) {
  const theme = useTheme()
  const at = pair.indexOf(' ')
  const key = at < 0 ? pair : pair.slice(0, at)
  return (
    <Text>
      <Text
        bold
        backgroundColor={theme.surface('chip')}
        inverse={theme.level === 0}
        {...(theme.level === 0 ? {} : theme.tone('accent'))}
      >
        {` ${key} `}
      </Text>
      {at >= 0 && <Text {...theme.tone('dim')}>{` ${pair.slice(at + 1)}`}</Text>}
    </Text>
  )
}

/** The `·`-separated `key action` pairs of one half, trimmed and non-empty. */
function pairs(text: string): string[] {
  return text
    .split('·')
    .map(part => part.trim())
    .filter(Boolean)
}

function Half({ text }: { text: string }) {
  return (
    <Box gap={2}>
      {pairs(text).map(pair => (
        <Pair key={pair} pair={pair} />
      ))}
    </Box>
  )
}

/**
 * The two-part key bar, cc-switch style: navigation on the left of a faint divider,
 * actions on the right. Each half is `·`-separated `key action` pairs.
 */
export function KeyBar({ left, right }: { left?: string; right: string }) {
  const theme = useTheme()
  return (
    <Box gap={2}>
      {left && <Half text={left} />}
      {left && <Text {...theme.tone('faint')}>│</Text>}
      <Half text={right} />
    </Box>
  )
}
