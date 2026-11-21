import { Box, Text } from 'ink'

import type { Translate } from '../i18n'
import { useFrame, useTheme } from './fx/context'
import { Spinner } from './fx/glyphs'
import { GradientText } from './fx/paint'
import { SWEEP_FRAMES, Wordmark } from './sidebar'

/** Frames between two passes of the boot sweep, so it reads as passes rather than a blur. */
const BOOT_PAUSE = 6

/**
 * The boot screen, shown only when loading the config takes a while: the wordmark
 * with a highlight band sweeping over it, a spinner and what is happening. A fast
 * load never shows it.
 */
export function Boot({ t, rows }: { t: Translate; rows: number }) {
  const theme = useTheme()
  const frame = useFrame(true)
  const sweep = frame === undefined ? undefined : frame % (SWEEP_FRAMES + BOOT_PAUSE)
  return (
    <Box flexDirection="column" height={rows} justifyContent="center" alignItems="center">
      <Wordmark sweepKey="boot" busy sweep={sweep !== undefined && sweep < SWEEP_FRAMES ? sweep : undefined} />
      <Text>
        <GradientText text="ZERO-CONFIG" bold /> <Text {...theme.tone('dim')}>CODE FLOW</Text>
      </Text>
      <Text> </Text>
      <Text>
        <Spinner /> <Text {...theme.tone('dim')}>{t('tui.boot.loading')}</Text>
      </Text>
    </Box>
  )
}
