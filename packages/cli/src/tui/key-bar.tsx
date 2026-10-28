import { Box, Text } from 'ink'

/**
 * One `key action` pair of the bottom bar: the key in cyan bold, the action dimmed,
 * so the bar reads like the shortcut strip over a list in other TUIs.
 */
function Pair({ pair }: { pair: string }) {
  const at = pair.indexOf(' ')
  if (at < 0) return <Text color="cyan">{pair}</Text>
  return (
    <Text>
      <Text bold color="cyan">
        {pair.slice(0, at)}
      </Text>
      <Text dimColor>{` ${pair.slice(at + 1)}`}</Text>
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

/**
 * The two-part key bar, cc-switch style: navigation on the left of a divider, actions
 * on the right. Each half is `·`-separated `key action` pairs; the divider stands out
 * a touch more than the dots.
 */
export function KeyBar({ left, right }: { left?: string; right: string }) {
  return (
    <Box gap={1}>
      {left && (
        <Box>
          {pairs(left).map((pair, index) => (
            <Text key={pair}>
              {index > 0 && <Text dimColor>{'  ·  '}</Text>}
              <Pair pair={pair} />
            </Text>
          ))}
        </Box>
      )}
      {left && <Text dimColor>│</Text>}
      <Box>
        {pairs(right).map((pair, index) => (
          <Text key={pair}>
            {index > 0 && <Text dimColor>{'  ·  '}</Text>}
            <Pair pair={pair} />
          </Text>
        ))}
      </Box>
    </Box>
  )
}
