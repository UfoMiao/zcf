import type { StepResult } from '@zcf/core'
import { ACTOR_NAMES } from '@zcf/core/schema'
import type { ApplyOutcome, ConfigEditor, PlanView, StepEvent, ZcfService } from '@zcf/ui-kit'
import { installPicks, summarizeChanges } from '@zcf/ui-kit'
import {
  ArrowRightIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  LoaderCircleIcon,
  MinusIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { Translate } from '../api'
import { messageText, tildify } from '../api'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'

const STEP_ICONS: Record<StepResult['status'], ReactNode> = {
  done: <CheckIcon className="size-4 text-success" />,
  unchanged: <MinusIcon className="text-muted-foreground size-4" />,
  skipped: <ArrowRightIcon className="text-muted-foreground size-4" />,
  failed: <XIcon className="text-destructive size-4" />,
}

type Phase = 'confirm' | 'busy' | 'done'

/**
 * The apply flow behind the Apply button: a confirmation of what changed in the config
 * and what applying installs — never a diff — then the run itself, step by step.
 */
export function ApplyDialog({
  editor,
  t,
  service,
  onSave,
  onClose,
}: {
  editor: ConfigEditor
  t: Translate
  service: ZcfService
  /** Saves the draft before planning. */
  onSave: () => Promise<boolean>
  onClose: () => void
}) {
  const [phase, setPhase] = useState<Phase>('confirm')
  const [error, setError] = useState<string>()
  const [view, setView] = useState<PlanView>()
  const [events, setEvents] = useState<StepEvent[]>([])
  const [outcome, setOutcome] = useState<ApplyOutcome>()
  // Only the latest plan request may fill the dialog; an older one can finish later.
  const latest = useRef(0)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phase !== 'busy') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onClose])

  const start = () => {
    setPhase('busy')
    setError(undefined)
    setEvents([])
    setOutcome(undefined)
    const request = ++latest.current
    void (async () => {
      if (!(await onSave())) {
        // The save refused an invalid draft; its status line already said why.
        setPhase('confirm')
        return
      }
      try {
        const next = await service.plan()
        if (request !== latest.current) return
        setView(next)
        await service.apply(event => setEvents(current => [...current, event]))
      } catch (reason) {
        if (request === latest.current) setError(String(reason instanceof Error ? reason.message : reason))
      } finally {
        if (request === latest.current) setPhase('done')
      }
    })()
  }

  const changes = summarizeChanges(editor.saved, editor.draft)
  const picks = installPicks(editor.draft, {})
  const steps = outcome?.results.flatMap(result => result.steps) ?? []
  const allOk = outcome?.results.every(result => result.ok)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-background max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t('tui.apply.title')}</h2>
          {phase !== 'busy' && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XIcon />
            </Button>
          )}
        </div>

        {phase === 'confirm' && (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">{t('tui.apply.confirmHint')}</p>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">{t('tui.apply.changes')}</span>
              {changes.length === 0 ? (
                <span className="text-muted-foreground text-xs">{t('tui.apply.noChanges')}</span>
              ) : (
                <ul className="font-mono text-xs">
                  {changes.map(change => (
                    <li key={change.key}>
                      {change.key}
                      {change.value !== undefined && `: ${change.value}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium">{t('tui.apply.installs')}</span>
              {picks.length === 0 ? (
                <span className="text-muted-foreground text-xs">{t('tui.apply.noInstalls')}</span>
              ) : (
                <ul className="text-xs">
                  {picks.map((pick, index) => (
                    <li key={`${pick.kind}-${index}`} className="font-mono">
                      {pick.label.startsWith('  ') ? (
                        pick.label
                      ) : (
                        <>
                          {t(`tui.apply.pick.${pick.kind}`)}: {pick.label}
                          {pick.note === 'installed' && ` (${t('tui.apply.installed')})`}
                          {pick.note === 'all' && ` (${t('tui.apply.allSkills')})`}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                {t('web.cancel')}
              </Button>
              <Button onClick={start}>{t('web.apply')}</Button>
            </div>
          </div>
        )}

        {phase === 'busy' && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <LoaderCircleIcon className="size-4 animate-spin" />
              {view ? t('tui.apply.applying') : t('tui.apply.planning')}
            </p>
            {view && (
              <div className="flex flex-col gap-3">
                {view.plan.tools.map(toolPlan => (
                  <div key={toolPlan.tool} className="flex flex-col">
                    <span className="mb-1 text-[13px] font-medium">{ACTOR_NAMES[toolPlan.tool]}</span>
                    <ol className="flex flex-col">
                      {toolPlan.steps.map((step, index) => {
                        const result = events.find(
                          event => event.tool === toolPlan.tool && event.index === index,
                        )?.result
                        const state = result?.status ?? 'pending'
                        return (
                          <li key={index} className="flex items-center gap-2 py-0.5">
                            <span className="flex size-5 shrink-0 items-center justify-center">
                              {state === 'pending' ? (
                                <span className="border-muted-foreground/40 size-2 rounded-full border-2" />
                              ) : (
                                STEP_ICONS[state]
                              )}
                            </span>
                            <span className="text-xs">{messageText(t, step.title)}</span>
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div className="flex flex-col gap-3">
            {error && (
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>{t('tui.apply.failed', { message: error })}</AlertTitle>
              </Alert>
            )}
            {outcome && (
              <Alert variant={allOk ? 'success' : 'destructive'}>
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
            <div className="flex justify-end">
              <Button onClick={onClose}>{t('web.close')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
