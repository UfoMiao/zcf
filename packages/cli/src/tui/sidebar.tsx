import type { ConfigEditor } from '@zcf/ui-kit'
import { draftIds, isTable } from '@zcf/ui-kit'
import { Box, Text } from 'ink'

import type { Translate } from '../i18n'
import { tildify } from '../render'

/**
 * The wordmark, crush-style: block letters with each row a step along a cyan-to-magenta
 * ramp, so the mark reads as one gradient at a glance.
 */
const LOGO_ROWS = ['██╗ █████╗ █████╗', '╚═╝ ╚════╝ ╚════╝'] as const
const LOGO_COLORS = ['#22d3ee', '#818cf8', '#c084fc'] as const

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
      <Box flexDirection="column" alignItems="center" marginTop={1}>
        {LOGO_ROWS.map((row, index) => (
          <Text key={row} bold color={LOGO_COLORS[index % LOGO_COLORS.length]}>
            {row}
          </Text>
        ))}
        <Text bold color={LOGO_COLORS[2]}>
          ZERO-CONFIG
        </Text>
      </Box>

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

      <Text dimColor> </Text>
      <Text dimColor wrap="truncate-end">
        {tildify(editor.path, home)}
      </Text>
      <Text dimColor>{version}</Text>
    </Box>
  )
}
