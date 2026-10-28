import { Box, Text } from 'ink'

import type { Translate } from '../i18n'

/**
 * The one-line header, crush-style: a small badge wordmark, then the facts a session
 * needs — version, config path, interface language, changes waiting to be applied —
 * each dimmed so the badge is the only loud thing on the line.
 */
export function Header({
  t,
  version,
  path,
  language,
  langHint,
  dirty,
}: {
  t: Translate
  version: string
  path: string
  /** The localized language name already resolved by the caller. */
  language: string
  /** The suffix shown while the L switch works, such as " (L)". */
  langHint: string
  dirty: boolean
}) {
  return (
    <Box gap={1}>
      <Text bold color="black" backgroundColor="cyan">
        {' zcf '}
      </Text>
      <Text dimColor>{version}</Text>
      <Text dimColor>{path}</Text>
      <Text dimColor>
        {t('field.language')}: {language}
        {langHint}
      </Text>
      {dirty && <Text color="yellow">● {t('tui.unsaved')}</Text>}
    </Box>
  )
}
