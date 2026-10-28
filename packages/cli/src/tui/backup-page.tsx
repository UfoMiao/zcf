import type { BackupInfo } from '@zcf/core'
import type { ZcfService } from '@zcf/ui-kit'
import { Box, Text } from 'ink'
import { useEffect, useState } from 'react'

import type { Translate } from '../i18n'
import { errorText } from '../i18n'
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
export function BackupPage({ service, t, active, dirty, onBack }: BackupPageProps) {
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

  const rows: Row[] = confirm
    ? [
        {
          id: 'confirm',
          label:
            confirm.kind === 'restore'
              ? t('tui.backup.confirmRestore', { id: confirm.id })
              : t('tui.backup.confirmPrune'),
          action: { type: 'run', run: () => (confirm.kind === 'restore' ? restore(confirm.id) : prune()) },
        },
        {
          id: 'cancel',
          label: t('tui.backup.cancel'),
          action: { type: 'run', run: () => setConfirm(undefined) },
        },
      ]
    : [
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

  return (
    <Box flexDirection="column" gap={1}>
      <Text dimColor>{t('tui.backup.intro')}</Text>
      {state === 'loading' && <Text dimColor>{t('tui.backup.loading')}</Text>}
      {state !== 'loading' && backups.length === 0 && !confirm && <Text dimColor>{t('cli.backup.none')}</Text>}
      {overDirty && <Text color="yellow">{t('tui.backup.restoredDirty')}</Text>}
      {/* Two lines at most, so the list below keeps its rows even when a result runs long. */}
      {lines.slice(-2).map((line, index) => (
        <Text key={`${index}-${line}`}>{line}</Text>
      ))}
      {/* Keyed by mode, so entering the confirm starts at its first row, not where the list left off. */}
      <RowList
        key={confirm ? 'confirm' : 'list'}
        rows={rows}
        active={active && state !== 'busy'}
        onBack={confirm ? () => setConfirm(undefined) : onBack}
      />
    </Box>
  )
}
