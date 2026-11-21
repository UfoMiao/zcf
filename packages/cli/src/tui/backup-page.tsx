import type { BackupInfo } from '@zcf/core'
import type { ZcfService } from '@zcf/ui-kit'
import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'

import type { Translate } from '../i18n'
import { errorText } from '../i18n'
import { Dialog } from './dialog'
import { useTheme } from './fx/context'
import type { Row } from './row-list'
import { RowList } from './row-list'

type Confirm = { kind: 'restore'; id: string } | { kind: 'prune' }

export interface BackupPageProps {
  service: ZcfService
  t: Translate
  active: boolean
  /** Unsaved editor changes: a restore rewrites the file under them, so they warn. */
  dirty: boolean
  onBack: () => void
  /** Columns the page has, so its dialogs fit. */
  width?: number
  /** Told when a confirmation opens or closes, so the app shows the dialog keys. */
  onDialog?: (open: boolean) => void
}

/** One run's line in the list: when it was made, why, and how much it holds. */
function entryValue(backup: BackupInfo, t: Translate): string {
  const date = backup.createdAt?.slice(0, 16).replace('T', ' ')
  const summary = t('tui.backup.entry', {
    reason: t(`cli.backup.reason.${backup.reason ?? 'unknown'}`),
    count: backup.entries.length,
  })
  return date ? `${date} · ${summary}` : summary
}

/**
 * The backups of the files ZCF changed, newest first: Enter asks before putting one back,
 * and pruning removes the runs past the newest 20. The page works on the files as they
 * are on disk, not on the draft.
 */
export function BackupPage({ service, t, active, dirty, onBack, width = 64, onDialog }: BackupPageProps) {
  const theme = useTheme()
  const [state, setState] = useState<'loading' | 'ready' | 'busy'>('loading')
  const [backups, setBackups] = useState<readonly BackupInfo[]>([])
  const [lines, setLines] = useState<string[]>([])
  const [confirm, setConfirm] = useState<Confirm>()
  // Set when a restore succeeded while the editor held unsaved changes.
  const [overDirty, setOverDirty] = useState(false)

  const load = () => {
    setState('loading')
    service.backups().then(
      list => {
        setBackups(list)
        setState('ready')
      },
      (error: unknown) => {
        setLines(current => [t('tui.backup.failed', { message: errorText(error, t) }), ...current])
        setState('ready')
      },
    )
  }

  // The list loads when the page opens, and again after each action; `t` is in the
  // dependencies so a failure notes itself in the language the UI switched to.
  useEffect(() => {
    load()
  }, [service, t])

  useEffect(() => {
    onDialog?.(confirm !== undefined)
  }, [confirm !== undefined])
  useEffect(() => () => onDialog?.(false), [])

  const note = (text: string) => setLines(current => [...current, text])

  const restore = (id: string) => {
    setState('busy')
    service
      .restoreBackup(id)
      .then(
        result => {
          note(
            t('cli.backup.restored', { changed: result.changed, unchanged: result.unchanged, missing: result.missing }),
          )
          if (result.corrupt > 0) note(t('cli.backup.corrupt', { count: result.corrupt }))
          if (result.outside > 0) note(t('cli.backup.outside', { count: result.outside }))
          if (result.id !== undefined) note(t('tui.backup.undo', { id: result.id }))
          // The restore rewrote the file under any unsaved editor changes.
          setOverDirty(dirty)
        },
        (error: unknown) => note(t('tui.backup.failed', { message: errorText(error, t) })),
      )
      .finally(() => {
        setConfirm(undefined)
        load()
      })
  }

  const prune = () => {
    setState('busy')
    service
      .pruneBackups()
      .then(
        removed => {
          note(
            removed.length > 0
              ? t('cli.backup.pruned', { count: removed.length, ids: removed.join(', ') })
              : t('cli.backup.prunedNone', { count: backups.length }),
          )
        },
        (error: unknown) => note(t('tui.backup.failed', { message: errorText(error, t) })),
      )
      .finally(() => {
        setConfirm(undefined)
        load()
      })
  }

  const rows: Row[] = [
    ...backups.map((backup): Row => ({
      id: backup.id,
      label: backup.id,
      value: entryValue(backup, t),
      action: { type: 'run', run: () => setConfirm({ kind: 'restore', id: backup.id }) },
    })),
    ...(backups.length > 0
      ? [
          {
            id: 'prune',
            label: t('tui.backup.prune'),
            action: { type: 'run' as const, run: () => setConfirm({ kind: 'prune' }) },
          },
        ]
      : []),
  ]

  // Both confirmations open on Cancel: a stray Enter never overwrites files or deletes backups.
  if (confirm) {
    const restoring = confirm.kind === 'restore'
    return (
      <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
        <Dialog
          width={Math.min(60, width)}
          initial={0}
          active={active && state !== 'busy'}
          onCancel={() => setConfirm(undefined)}
          buttons={[
            { label: t('tui.button.cancel'), run: () => setConfirm(undefined) },
            restoring
              ? { label: t('tui.button.restore'), run: () => restore(confirm.id), destructive: true }
              : { label: t('tui.button.prune'), run: prune, destructive: true },
          ]}
        >
          <Box flexDirection="column">
            <Text bold {...theme.tone('accent')}>
              {restoring ? t('tui.backup.restoreTitle') : t('tui.backup.pruneTitle')}
            </Text>
            <Text>{restoring ? t('tui.backup.restoreBody', { id: confirm.id }) : t('tui.backup.pruneBody')}</Text>
          </Box>
        </Dialog>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text {...theme.tone('dim')}>{t('tui.backup.intro')}</Text>
      {state === 'loading' && <Text {...theme.tone('dim')}>{t('tui.backup.loading')}</Text>}
      {state !== 'loading' && backups.length === 0 && <Text {...theme.tone('dim')}>{t('cli.backup.none')}</Text>}
      {overDirty && <Text {...theme.tone('warn')}>{t('tui.backup.restoredDirty')}</Text>}
      {/* Two lines at most, so the list below keeps its rows even when a result runs long. */}
      {lines.slice(-2).map((line, index) => (
        <Text key={`${index}-${line}`}>{line}</Text>
      ))}
      <RowList rows={rows} active={active && state !== 'busy'} onBack={onBack} />
    </Box>
  )
}
