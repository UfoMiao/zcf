import { Box, Text } from 'ink'

import type { Translate } from '../i18n'
import { useTheme } from './fx/context'
import { Hatch } from './fx/glyphs'
import { FillText } from './fx/paint'
import { textWidth } from './text-width'

/** The longest hatch the header trails; past this it would only be noise. */
const HATCH_MAX = 16

/** The shortest hatch worth drawing. */
const HATCH_MIN = 3

/**
 * The one-line header, crush-style: a gradient badge wordmark, then the facts a session
 * needs — version, config path, interface language, changes waiting to be applied —
 * each dimmed so the badge is the only loud thing on the line. A hatch trails them
 * only where the line has room left, so it never pushes into the facts.
 */
export function Header({
  t,
  version,
  path,
  language,
  langHint,
  dirty,
  columns,
}: {
  t: Translate
  version: string
  path: string
  /** The localized language name already resolved by the caller. */
  language: string
  /** The suffix shown while the L switch works, such as " (L)". */
  langHint: string
  dirty: boolean
  /** Terminal columns, to tell whether the hatch fits. */
  columns: number
}) {
  const theme = useTheme()
  const languageText = `${t('field.language')}: ${language}${langHint}`
  const dirtyText = `● ${t('tui.unsaved')}`
  const parts = [' zcf ', version, path, languageText, ...(dirty ? [dirtyText] : [])]
  // Each part plus the one-column gap after it, and a column of slack at the end.
  const used = parts.reduce((sum, part) => sum + textWidth(part) + 1, 0) + 1
  const hatch = Math.min(HATCH_MAX, columns - used)
  return (
    <Box gap={1}>
      <FillText text=" zcf " />
      <Text {...theme.tone('dim')}>{version}</Text>
      <Text {...theme.tone('dim')}>{path}</Text>
      <Text {...theme.tone('dim')}>{languageText}</Text>
      {dirty && <Text {...theme.tone('warn')}>{dirtyText}</Text>}
      {hatch >= HATCH_MIN && <Hatch width={hatch} />}
    </Box>
  )
}
