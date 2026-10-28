import type { BackupInfo, RestoreResult } from '@zcf/core'
import { ArchiveRestoreIcon, CircleAlertIcon, LoaderCircleIcon, RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Translate } from '../api'
import { httpService } from '../api'
import { EmptyState, PageHeader } from '../components/page'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'

/** What the user asked to go ahead with: one restore, or a prune that keeps so many. */
type Pending = { kind: 'restore'; id: string } | { kind: 'prune'; keep: number }

/** What an error reads like in the status line: its message, or itself as text. */
const toMessage = (reason: unknown): string => (reason instanceof Error ? reason.message : String(reason))

/** The one-line description of a run, in the shape the CLI prints. */
function runSummary(t: Translate, run: BackupInfo): string {
  const reason = run.reason === undefined ? 'unknown' : run.reason
  return t('cli.backup.summary', {
    id: run.id,
    reason: t(`cli.backup.reason.${reason}`),
    count: Array.isArray(run.entries) ? run.entries.length : 0,
  })
}

export function BackupPage({ t }: { t: Translate }) {
  const [list, setList] = useState<BackupInfo[]>()
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState<Pending>()
  const [busy, setBusy] = useState(false)
  const [restored, setRestored] = useState<RestoreResult & { id: string }>()
  const [pruned, setPruned] = useState<string[]>()
  const [keep, setKeep] = useState('20')

  const load = () => {
    setError(undefined)
    httpService.backups().then(setList, (reason: unknown) => {
      setList([])
      setError(toMessage(reason))
    })
  }
  useEffect(load, [])

  const restore = (id: string) => {
    setBusy(true)
    httpService
      .restoreBackup(id)
      .then(result => {
        setRestored({ ...result, id })
        setPending(undefined)
        // The restore itself added an undo run, so the list as it stands is stale.
        load()
      })
      .catch((reason: unknown) => setError(toMessage(reason)))
      .finally(() => setBusy(false))
  }

  const prune = (keepCount: number) => {
    setBusy(true)
    httpService
      .pruneBackups(keepCount)
      .then(ids => {
        setPruned(ids)
        setPending(undefined)
        load()
      })
      .catch((reason: unknown) => setError(toMessage(reason)))
      .finally(() => setBusy(false))
  }

  const confirmBar = (ask: string, onConfirm: () => void) => (
    <Alert variant="warning" className="mb-4">
      <TriangleAlertIcon />
      <AlertTitle className="flex flex-wrap items-center gap-3">
        {ask}
        <span className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setPending(undefined)} disabled={busy}>
            {t('web.backup.cancel')}
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={busy}>
            {busy && <LoaderCircleIcon className="animate-spin" />}
            {t('web.backup.confirm')}
          </Button>
        </span>
      </AlertTitle>
    </Alert>
  )

  return (
    <section>
      <PageHeader
        title={t('tui.page.backup')}
        intro={t('web.backup.intro')}
        actions={
          <Button variant="outline" onClick={load} disabled={busy}>
            <RefreshCwIcon />
            {t('web.backup.refresh')}
          </Button>
        }
      />
      {error && (
        <Alert variant="destructive" className="mb-4">
          <CircleAlertIcon />
          <AlertTitle>{t('cli.unexpectedError', { message: error })}</AlertTitle>
        </Alert>
      )}
      {pending?.kind === 'restore' && confirmBar(t('web.backup.restoreConfirm'), () => restore(pending.id))}
      {pending?.kind === 'prune' &&
        confirmBar(t('web.backup.pruneConfirm', { keep: pending.keep }), () => prune(pending.keep))}
      {restored && (
        <Alert variant="success" className="mb-4">
          <ArchiveRestoreIcon />
          <div className="flex flex-col gap-0.5">
            <AlertTitle>
              {t('cli.backup.restored', {
                changed: restored.changed,
                unchanged: restored.unchanged,
                missing: restored.missing,
              })}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-0.5">
              {restored.corrupt > 0 && <span>{t('cli.backup.corrupt', { count: restored.corrupt })}</span>}
              {restored.outside > 0 && <span>{t('cli.backup.outside', { count: restored.outside })}</span>}
              {restored.id && <span className="font-mono">{t('web.backup.undo', { id: restored.id })}</span>}
            </AlertDescription>
          </div>
        </Alert>
      )}
      {pruned && (
        <Alert variant="info" className="mb-4">
          <ArchiveRestoreIcon />
          <AlertTitle>
            {pruned.length > 0
              ? t('cli.backup.pruned', { count: pruned.length, ids: pruned.join(', ') })
              : t('cli.backup.prunedNone', { count: list?.length ?? 0 })}
          </AlertTitle>
        </Alert>
      )}
      {list === undefined ? (
        <p className="text-muted-foreground px-1 text-xs" aria-busy="true">
          {t('tui.loading')}
        </p>
      ) : list.length === 0 ? (
        <EmptyState icon={<ArchiveRestoreIcon />} title={t('web.backup.emptyTitle')}>
          {t('web.backup.intro')}
        </EmptyState>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y p-0">
            {list.map(run => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-mono text-[13px] font-medium">{run.id}</span>
                  <span className="text-muted-foreground text-xs">
                    {run.createdAt ? `${new Date(run.createdAt).toLocaleString()} · ` : ''}
                    {runSummary(t, run)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {pending?.kind === 'restore' && pending.id === run.id ? (
                    <span className="text-warning text-xs font-medium">{t('web.backup.restoreConfirm')}</span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setRestored(undefined)
                        setPending({ kind: 'restore', id: run.id })
                      }}
                    >
                      {t('web.backup.restore')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
        <label htmlFor="backup.keep" className="flex flex-col gap-1.5 text-[13px] font-medium">
          {t('web.backup.keep')}
          <Input
            id="backup.keep"
            type="number"
            min={1}
            value={keep}
            onChange={event => setKeep(event.target.value)}
            className="w-24"
            aria-label={t('web.backup.keep')}
          />
        </label>
        <Button
          variant="outline"
          disabled={busy || !list?.length}
          onClick={() => {
            setPruned(undefined)
            setPending({ kind: 'prune', keep: Math.max(1, Number(keep) || 20) })
          }}
        >
          {t('web.backup.prune')}
        </Button>
      </div>
    </section>
  )
}
