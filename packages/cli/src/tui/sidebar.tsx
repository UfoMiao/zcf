import type { ConfigEditor } from '@zcf/ui-kit'
import { draftIds, isTable } from '@zcf/ui-kit'
import { Box, Text } from 'ink'

import type { Translate } from '../i18n'
import { tildify } from '../render'

/**
 * The wordmark's letterforms, crush-style: three rows of half blocks per letter, each
 * letter one step along the cyan-to-magenta ramp, so the mark reads as one gradient
 * flowing through the letters.
 */
const LETTERS = [
  { color: '#22d3ee', rows: ['▀▀▀▀▀█', '   ▄▀', '█▄▄▄▄▄'] },
  { color: '#818cf8', rows: ['▄▀▀▀▀', '█    ', '▀▀▀▀ '] },
  { color: '#c084fc', rows: ['█▀▀▀▀', '█▀▀  ', '▀    '] },
] as const

/** How wide the letterforms are together, letters and one space between each. */
const WORD_WIDTH = LETTERS.reduce((sum, letter) => sum + letter.rows[0].length + 1, -1)

/** The diagonal fill that frames the wordmark, the way crush frames its own. */
const FIELD_COLOR = '#c084fc'

/** The wordmark: a diagonal field over and under the gradient letterforms. The
 * column's height budget is tight at the usual 30 rows, so the mark carries one
 * field line above and one below — the column cannot afford crush's two on top. */
function Wordmark() {
  return (
    <Box flexDirection="column" alignItems="center" marginTop={1}>
      <Text color={FIELD_COLOR}>{'╱'.repeat(WORD_WIDTH)}</Text>
      {/* Inline color segments rather than nested boxes: yoga's measurement of
       * half-block rows inside a row of columns drops lines on a real stream. */}
      {LETTERS[0].rows.map((_, index) => (
        <Text key={index}>
          <Text bold color={LETTERS[0].color}>
            {LETTERS[0].rows[index]}
          </Text>{' '}
          <Text bold color={LETTERS[1].color}>
            {LETTERS[1].rows[index]}
          </Text>{' '}
          <Text bold color={LETTERS[2].color}>
            {LETTERS[2].rows[index]}
          </Text>
        </Text>
      ))}
      <Text color={FIELD_COLOR}>{'╱'.repeat(WORD_WIDTH)}</Text>
      <Text bold color={FIELD_COLOR}>
        ZERO-CONFIG
      </Text>
    </Box>
  )
}

/** One status entry on its own two lines: a dim label over a plain value, so long
 * values never truncate inside the narrow column. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Text>
      <Text dimColor>{label}</Text>
      {'\n'}
      {value}
    </Text>
  )
}

/**
 * The right sidebar: the wordmark over a live picture of what the config holds —
 * changes waiting to be applied, the picks and their counts, the tool state — with
 * the version and config path at the foot. The chat apps put their session state
 * here; a config editor's state is the config itself.
 */
export function Sidebar({
  editor,
  t,
  version,
  home,
  installedTools,
}: {
  editor: ConfigEditor
  t: Translate
  version: string
  home: string
  /** How many of the picked tools the machine already has. */
  installedTools: number
}) {
  const draft = editor.draft as Record<string, unknown>
  const tools = draftIds(draft.tools)
  const skills = Array.isArray(draft.skills) ? draft.skills.length : 0
  const agents = draftIds(draft.agents).length
  const styles = draftIds(isTable(draft.styles) ? draft.styles.outputStyles : undefined).length
  const servers = Object.keys(isTable(draft.mcpServers) ? draft.mcpServers : {}).length

  return (
    <Box flexDirection="column" width={26} borderStyle="round" borderDimColor paddingX={1} gap={1}>
      <Wordmark />

      <Box flexDirection="column">
        {editor.dirty ? (
          <Text color="yellow">● {t('tui.unsaved')}</Text>
        ) : (
          <Text color="green">✓ {t('tui.init.clean')}</Text>
        )}
        <Stat
          label={t('tui.page.tools')}
          value={t('tui.sidebar.tools', { picked: tools.length, installed: installedTools })}
        />
        <Stat label={t('tui.page.skills')} value={t('tui.sidebar.count', { count: skills })} />
        <Stat label={t('tui.page.workflows')} value={t('tui.sidebar.agents', { count: agents })} />
        <Stat label={t('tui.page.styles')} value={t('tui.sidebar.count', { count: styles })} />
        <Stat label={t('tui.page.mcp')} value={t('tui.sidebar.count', { count: servers })} />
      </Box>

      {/* One block, so the column's gap does not multiply into its rows: the
       * height budget is one line of slack at the usual 30 rows, and each extra
       * gap line would make yoga drop a wordmark row on the real stream. */}
      <Box flexDirection="column">
        {/* The diagonal rule that closes the status block, echoing the wordmark's
         * field; 22 fills the column inside its borders and padding. */}
        <Text color="#818cf8">{'╱'.repeat(22)}</Text>
        <Text dimColor wrap="truncate-end">
          {tildify(editor.path, home)}
        </Text>
        <Text dimColor>{version}</Text>
      </Box>
    </Box>
  )
}
