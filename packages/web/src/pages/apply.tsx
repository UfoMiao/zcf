import type { StepResult } from '@zcf/core'
import { ACTOR_NAMES } from '@zcf/core/schema'
import type { ApplyOutcome, ConfigEditor, PlanView, StepEvent, ZcfService } from '@zcf/ui-kit'
import {
  ArrowRightIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  FilePlus2Icon,
  InfoIcon,
  LoaderCircleIcon,
  MinusIcon,
  RefreshCwIcon,
  SaveIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { Translate } from '../api'
import { messageText, tildify } from '../api'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { cn } from '../lib/utils'

/** A patch as quiet colored lines: one row per line, tinted by what it does. */
function Patch({ text }: { text: string }) {
  const lines = text.split('\n').filter(line => line && !/^(Index:|====|\+\+\+|---)/.test(line))
  return (
    <div className="overflow-x-auto rounded-md border font-mono text-xs leading-5">
      {lines.map((line, index) => (
        <div
          key={index}
          className={cn(
            'px-2 whitespace-pre',
            line.startsWith('+') && 'bg-diff-add-bg text-diff-add-fg',
            line.startsWith('-') && 'bg-diff-del-bg text-diff-del-fg',
            line.startsWith('@@') && 'text-primary/80',
          )}
        >
          {line || ' '}
        </div>
      ))}
    </div>
  )
}

const STEP_ICONS: Record<StepResult['status'], ReactNode> = {
  done: <CheckIcon className="size-4 text-success" />,
  unchanged: <MinusIcon className="size-4 text-muted-foreground" />,
  skipped: <ArrowRightIcon className="size-4 text-muted-foreground" />,
  failed: <XIcon className="size-4 text-destructive" />,
}

export function ApplyPage({
  editor,
  t,
  service,
  onSave,
}: {
  editor: ConfigEditor
  t: Translate
  service: ZcfService
  onSave: () => void
}) {
  const [view, setView] = useState<PlanView>()
  const [error, setError] = useState<string>()
  const [applyError, setApplyError] = useState<string>()
  const [events, setEvents] = useState<StepEvent[]>([])
  const [outcome, setOutcome] = useState<ApplyOutcome>()
  const [busy, setBusy] = useState(false)
  // Only the latest plan request may fill the page; an older one can finish later.
  const latest = useRef(0)

  const plan = () => {
    const request = ++latest.current
    setView(undefined)
    setError(undefined)
    setEvents([])
    setOutcome(undefined)
    setApplyError(undefined)
    service.plan().then(
      next => request === latest.current && setView(next),
      (reason: unknown) =>
        request === latest.current && setError(String(reason instanceof Error ? reason.message : reason)),
    )
  }
  useEffect(() => {
    if (!editor.dirty) plan()
  }, [editor.dirty])

  const apply = () => {
    setBusy(true)
    setEvents([])
    setApplyError(undefined)
    service
      .apply(event => setEvents(current => [...current, event]))
      .then(setOutcome, (reason: unknown) => setApplyError(String(reason instanceof Error ? reason.message : reason)))
      .finally(() => setBusy(false))
  }

  if (editor.dirty) {
    return (
      <section>
        <Alert variant="warning">
          <TriangleAlertIcon />
          <AlertTitle className="flex flex-wrap items-center gap-3">
            {t('tui.apply.saveFirst')}
            <Button size="sm" variant="outline" onClick={onSave}>
              <SaveIcon />
              {t('web.save')}
            </Button>
          </AlertTitle>
        </Alert>
      </section>
    )
  }
  if (error) {
    return (
      <section>
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t('tui.apply.failed', { message: error })}</AlertTitle>
        </Alert>
      </section>
    )
  }
  if (!view) {
    return (
      <section className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </section>
    )
  }
  if (view.plan.tools.length === 0) {
    return (
      <section>
        <Alert variant="info">
          <InfoIcon />
          <AlertTitle>{t('tui.apply.noTools')}</AlertTitle>
        </Alert>
      </section>
    )
  }

  const work = view.plan.tools.some((toolPlan, toolIndex) =>
    toolPlan.steps.some((_, index) => view.previews[toolIndex]?.[index]?.changed ?? true),
  )
  const pending = view.plan.tools.reduce(
    (sum, toolPlan, toolIndex) =>
      sum + toolPlan.steps.filter((_, index) => view.previews[toolIndex]?.[index]?.changed ?? true).length,
    0,
  )
  const steps = outcome?.results.flatMap(result => result.steps) ?? []
  const allOk = outcome?.results.every(result => result.ok)

  return (
    <section>
      <div className="flex flex-col gap-4">
        {view.plan.tools.map((toolPlan, toolIndex) => (
          <Card key={toolPlan.tool}>
            <CardHeader className="flex-row items-center justify-between py-3.5">
              <CardTitle>{ACTOR_NAMES[toolPlan.tool]}</CardTitle>
              {outcome && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    outcome.results.find(result => result.tool === toolPlan.tool)?.ok
                      ? 'text-success'
                      : 'text-destructive',
                  )}
                >
                  {outcome.results.find(result => result.tool === toolPlan.tool)?.ok ? (
                    <CircleCheckIcon className="size-3.5" />
                  ) : (
                    <CircleAlertIcon className="size-3.5" />
                  )}
                </span>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {toolPlan.notices.map(notice => (
                <p
                  key={notice.message.key}
                  className={cn(
                    'mb-2 rounded-md px-2.5 py-1.5 text-xs leading-relaxed',
                    notice.level === 'warning' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {messageText(t, notice.message)}
                </p>
              ))}
              <ol className="flex flex-col">
                {toolPlan.steps.map((step, index) => {
                  const preview = view.previews[toolIndex]?.[index]
                  const result = events.find(event => event.tool === toolPlan.tool && event.index === index)?.result
                  const state = result?.status ?? (busy ? 'running' : 'pending')
                  return (
                    <li key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex size-6 shrink-0 items-center justify-center">
                          {state === 'running' ? (
                            <LoaderCircleIcon className="text-primary size-4 animate-spin" />
                          ) : state === 'pending' ? (
                            <span className="border-muted-foreground/40 size-2 rounded-full border-2" />
                          ) : (
                            STEP_ICONS[state]
                          )}
                        </div>
                        {index < toolPlan.steps.length - 1 && <div className="bg-border w-px flex-1" />}
                      </div>
                      <div className="min-w-0 flex-1 pb-5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[13px] font-medium">{messageText(t, step.title)}</span>
                          {preview && !preview.changed && (
                            <span className="text-muted-foreground text-xs">({t('cli.unchanged')})</span>
                          )}
                          {preview?.changed && preview.before === undefined && (
                            <span className="text-primary inline-flex items-center gap-1 text-xs">
                              <FilePlus2Icon className="size-3" />({t('cli.newFile')})
                            </span>
                          )}
                        </div>
                        <code className="text-muted-foreground mt-1 block w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] break-all">
                          {step.kind === 'command'
                            ? `$ ${[step.command, ...step.args].join(' ')}`
                            : step.kind === 'copy'
                              ? `${tildify(step.from)} -> ${tildify(step.to)}`
                              : tildify(step.path)}
                        </code>
                        {preview?.changed && (
                          <div className="mt-2">
                            <Patch text={preview.patch} />
                          </div>
                        )}
                        {result?.detail && (
                          <pre className="text-destructive bg-destructive/5 mt-2 overflow-x-auto rounded-md border border-destructive/30 p-2 font-mono text-xs">
                            {result.detail}
                          </pre>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>

      {applyError && (
        <Alert variant="destructive" className="mt-4">
          <CircleAlertIcon />
          <AlertTitle>{t('cli.unexpectedError', { message: applyError })}</AlertTitle>
        </Alert>
      )}
      {outcome && (
        <Alert variant={allOk ? 'success' : 'destructive'} className="mt-4">
          {allOk ? <CircleCheckIcon /> : <CircleAlertIcon />}
          <div className="flex flex-col gap-0.5">
            <AlertTitle>
              {allOk
                ? t('cli.applyDone', {
                    done: steps.filter(step => step.status === 'done').length,
                    unchanged: steps.filter(step => step.status === 'unchanged').length,
                  })
                : t('cli.applyFailed', { count: outcome.results.filter(result => !result.ok).length })}
            </AlertTitle>
            {steps.some(step => step.backup) && (
              <AlertDescription className="font-mono">
                {t('cli.backups', { path: tildify(outcome.backupDir) })}
              </AlertDescription>
            )}
          </div>
        </Alert>
      )}

      <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t bg-background/95 pt-3 pb-4 backdrop-blur sm:-mx-8 lg:-mx-10">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground hidden text-xs sm:block">
            {busy ? t('tui.apply.applying') : work ? t('web.apply.pending', { count: pending }) : t('cli.nothingToDo')}
          </span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={plan} disabled={busy}>
              <RefreshCwIcon />
              {t('web.refresh')}
            </Button>
            <Button onClick={apply} disabled={busy || !work}>
              {busy && <LoaderCircleIcon className="animate-spin" />}
              {busy ? t('tui.apply.applying') : work ? t('web.apply') : t('cli.nothingToDo')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
