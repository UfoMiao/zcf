import type { ConfigEditor } from '@zcf/ui-kit'
import { draftIds, isTable } from '@zcf/ui-kit'
import { Box, Text } from 'ink'

import type { Translate } from '../i18n'
import { tildify } from '../render'
import { useOneShot, useTheme } from './fx/context'
import { Spinner, TideLine } from './fx/glyphs'
import { GradientText, sweepColumn } from './fx/paint'
import { textWidth } from './text-width'

/**
 * The wordmark's letterforms: the ANSI-shadow style v3 flew on its banner — block
 * letters with the ╗╝ corner strokes — shrunk one step to fit the sidebar's column.
 */
export const LOGO_ROWS = [
  '██████╗  ██████╗ ██████╗',
  '   ██╔╝ ██╔════╝ ██╔═══╝',
  ' ██╔╝   ██║      █████╗ ',
  '██████╗ ╚██████╗ ██╔══╝ ',
  '╚════╝   ╚═════╝ ██║    ',
] as const

/** Columns the wordmark spans; every row shares one gradient across them. */
export const LOGO_WIDTH = 24

/** Frames of the highlight sweep across the wordmark: about 1.1 s at 80 ms a frame. */
export const SWEEP_FRAMES = 14

/**
 * The wordmark: v3's letterforms painted on the gradient, nothing stacked above or
 * below them but the tide line. A highlight band sweeps across once on launch and
 * once after each successful apply; the tide rolls only while ZCF plans or applies.
 */
export function Wordmark({ sweepKey, busy, sweep }: { sweepKey: unknown; busy: boolean; sweep?: number }) {
  const shot = useOneShot(SWEEP_FRAMES, sweepKey)
  const frame = sweep ?? shot
  const band = frame === undefined ? undefined : sweepColumn(frame, SWEEP_FRAMES, LOGO_WIDTH)
  return (
    <Box flexDirection="column">
      {LOGO_ROWS.map(row => (
        <GradientText key={row} text={row} span={LOGO_WIDTH} sweep={band} bold />
      ))}
      <TideLine rolling={busy} />
    </Box>
  )
}

/** One status entry: a dim label padded to `column`, so the values line up, and its value. */
function Stat({ label, value, column }: { label: string; value: string; column: number }) {
  const theme = useTheme()
  return (
    <Text wrap="truncate-end">
      <Text {...theme.tone('dim')}>{label}</Text>
      {' '.repeat(Math.max(1, column - textWidth(label)))}
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
  busy,
  sweepKey,
}: {
  editor: ConfigEditor
  t: Translate
  version: string
  home: string
  /** How many of the picked tools the machine already has. */
  installedTools: number
  /** Whether ZCF is planning or applying right now. */
  busy: boolean
  /** Changes after each successful apply, replaying the wordmark's sweep. */
  sweepKey: number
}) {
  const theme = useTheme()
  const draft = editor.draft as Record<string, unknown>
  const tools = draftIds(draft.tools)
  const skills = Array.isArray(draft.skills) ? draft.skills.length : 0
  const agents = draftIds(draft.agents).length
  const styles = draftIds(isTable(draft.styles) ? draft.styles.outputStyles : undefined).length
  const servers = Object.keys(isTable(draft.mcpServers) ? draft.mcpServers : {}).length
  const installed = Math.min(installedTools, tools.length)
  const labels = ['skills', 'workflows', 'styles', 'mcp'].map(id => t(`tui.page.${id}`))
  const column = Math.max(...labels.map(textWidth)) + 1

  return (
    <Box flexDirection="column" width={28} borderStyle="round" borderDimColor paddingX={1} gap={1}>
      <Box flexDirection="column" marginTop={1}>
        <Wordmark sweepKey={sweepKey} busy={busy} />
        <Text>
          <GradientText text="ZERO-CONFIG" bold /> <Text {...theme.tone('dim')}>CODE FLOW</Text>
        </Text>
      </Box>

      <Box flexDirection="column">
        {busy ? (
          <Text {...theme.tone('accent')}>
            <Spinner /> {t('tui.sidebar.applying')}
          </Text>
        ) : editor.dirty ? (
          <Text {...theme.tone('warn')}>● {t('tui.unsaved')}</Text>
        ) : (
          <Text {...theme.tone('ok')}>✓ {t('tui.init.clean')}</Text>
        )}
        <Text {...theme.tone('dim')}>{t('tui.page.tools')}</Text>
        {/* One cell a pick: filled when the machine has the tool, hollow when apply installs it. */}
        <Text wrap="truncate-end">
          <Text {...theme.tone('accent')}>{'■'.repeat(installed)}</Text>
          <Text {...theme.tone('dim')}>{'□'.repeat(tools.length - installed)}</Text>
          {tools.length > 0 ? ' ' : ''}
          {t('tui.sidebar.installed', { installed, picked: tools.length })}
        </Text>
        <Stat label={labels[0]!} column={column} value={t('tui.sidebar.count', { count: skills })} />
        <Stat label={labels[1]!} column={column} value={t('tui.sidebar.agents', { count: agents })} />
        <Stat label={labels[2]!} column={column} value={t('tui.sidebar.count', { count: styles })} />
        <Stat label={labels[3]!} column={column} value={t('tui.sidebar.count', { count: servers })} />
      </Box>

      {/* One block, so the column's gap does not multiply into its rows: the height
       * budget is a line of slack at the usual 30 rows. */}
      <Box flexDirection="column">
        <Text {...theme.tone('faint')}>{'─'.repeat(LOGO_WIDTH)}</Text>
        <Text {...theme.tone('dim')} wrap="truncate-end">
          {tildify(editor.path, home)}
        </Text>
        <Text {...theme.tone('dim')}>{version}</Text>
      </Box>
    </Box>
  )
}
