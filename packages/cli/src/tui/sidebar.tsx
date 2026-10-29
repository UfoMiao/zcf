import type { ConfigEditor } from '@zcf/ui-kit'
import { draftIds, isTable } from '@zcf/ui-kit'
import { Box, Text } from 'ink'

import type { Translate } from '../i18n'
import { tildify } from '../render'

/**
 * The wordmark's letterforms: the ANSI-shadow style v3 flew on its banner — block
 * letters with the ╗╝ corner strokes — shrunk one step to fit the sidebar's column.
 * v3 flew it in cyan, so cyan it stays.
 */
const LOGO_ROWS = [
  '██████╗  ██████╗ ██████╗',
  '   ██╔╝ ██╔════╝ ██╔═══╝',
  ' ██╔╝   ██║      █████╗ ',
  '██████╗ ╚██████╗ ██╔══╝ ',
  '╚════╝   ╚═════╝ ██║    ',
] as const

/**
 * The diagonal fill that frames the wordmark, crush-style but stepped: the rows
 * differ in length and indent, so the field reads as a hatch, not a box.
 */
const FIELD_ROWS_ABOVE = ['            ╱╱╱╱╱╱', '    ╱╱╱╱╱╱╱╱╱╱╱╱╱╱'] as const
const FIELD_ROWS_BELOW = ['    ╱╱╱╱╱╱╱╱╱╱╱╱╱╱', '            ╱╱╱╱╱╱'] as const

/** The wordmark: a stepped diagonal field around v3's cyan letterforms. */
function Wordmark() {
  return (
    <Box flexDirection="column" marginTop={1}>
      {FIELD_ROWS_ABOVE.map(row => (
        <Text key={row} color="cyan" dimColor>
          {row}
        </Text>
      ))}
      {LOGO_ROWS.map(row => (
        <Text key={row} bold color="cyan">
          {row}
        </Text>
      ))}
      {FIELD_ROWS_BELOW.map(row => (
        <Text key={row} color="cyan" dimColor>
          {row}
        </Text>
      ))}
      <Text bold color="cyan">
        ZERO-CONFIG
      </Text>
    </Box>
  )
}

/**
 * One status entry. The tools value is the only one that outgrows the column in
 * English, so it keeps its value on its own line; the counts fit beside their labels.
 */
function Stat({ label, value, stacked = false }: { label: string; value: string; stacked?: boolean }) {
  return (
    <Text wrap="truncate-end">
      <Text dimColor>{label}</Text>
      {stacked ? '\n' : ' '}
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
    <Box flexDirection="column" width={28} borderStyle="round" borderDimColor paddingX={1} gap={1}>
      <Wordmark />

      <Box flexDirection="column">
        {editor.dirty ? (
          <Text color="yellow">● {t('tui.unsaved')}</Text>
        ) : (
          <Text color="green">✓ {t('tui.init.clean')}</Text>
        )}
        <Stat
          stacked
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
         * field; 24 fills the column inside its borders and padding. */}
        <Text color="cyan" dimColor>
          {'╱'.repeat(24)}
        </Text>
        <Text dimColor wrap="truncate-end">
          {tildify(editor.path, home)}
        </Text>
        <Text dimColor>{version}</Text>
      </Box>
    </Box>
  )
}
