import type { FilePreview, Plan, PlanStep, ToolStatus } from '@zcf/core'
import type { ConfigChange, PlanView, ZcfService } from '@zcf/ui-kit'
import { installPicks, summarizeChanges } from '@zcf/ui-kit'
import { type DOMElement, Box, Text, measureElement, useInput } from 'ink'
import { useEffect, useRef, useState } from 'react'

import type { Translate } from '../i18n'
import { errorText } from '../i18n'
import { hasWork, Renderer } from '../render'
import { contains, onMousePress, wheelDirection } from './mouse'
import { useTerminalRows } from './use-terminal-rows'

type Phase = 'confirm' | 'planning' | 'running' | 'done'

/** Pair each step with its file preview, by position in the plan. */
function previewMap(view: PlanView): Map<PlanStep, FilePreview> {
  const map = new Map<PlanStep, FilePreview>()
  for (const [toolIndex, toolPlan] of view.plan.tools.entries()) {
    for (const [index, step] of toolPlan.steps.entries()) {
      const preview = view.previews[toolIndex]?.[index]
      if (preview) map.set(step, preview)
    }
  }
  return map
}

export interface ApplyFlowProps {
  service: ZcfService
  t: Translate
  home: string
  active: boolean
  /** The draft about to be saved, and the config it replaces. */
  draft: Record<string, unknown>
  base: Record<string, unknown> | undefined
  /** What the machine already has, so the confirmation can tell install from configure. */
  detected: Partial<Record<string, ToolStatus>>
  /** Saves the draft before planning; resolves false when it refused an invalid one. */
  save: () => Promise<boolean>
  onClose: () => void
}

/**
 * The confirm-then-run flow behind the apply key: the confirmation shows what changed
 * in the config and what will be installed — never a diff — and Enter saves, plans
 * and applies, listing each step as it finishes.
 */
export function ApplyFlow({ service, t, home, active, draft, base, detected, save, onClose }: ApplyFlowProps) {
  const [phase, setPhase] = useState<Phase>('confirm')
  const [lines, setLines] = useState<string[]>([])
  const [scroll, setScroll] = useState(0)
  const renderer = useRef<Renderer>(undefined)
  // The plan the renderer last showed, so the apply summary can tell skipped tools apart.
  const shownPlan = useRef<Plan>({ tools: [] })
  const height = Math.max(5, useTerminalRows() - 9)

  const output = { write: (text: string) => setLines(current => [...current, ...text.replace(/\n$/, '').split('\n')]) }

  const start = () => {
    setLines([])
    setScroll(0)
    void (async () => {
      // A refused save stays on the confirmation — the planning phase only starts once
      // there is a saved config to plan, so Esc works while the refusal lands.
      if (!(await save())) return
      setPhase('planning')
      try {
        const view = await service.plan()
        renderer.current = new Renderer(output, t, view.secrets, home)
        shownPlan.current = view.plan
        const previews = previewMap(view)
        const changes = hasWork(view.plan, previews)
        if (view.plan.tools.length === 0) renderer.current.line(t('tui.apply.noTools'))
        // The run view lists each step once — its title and what it runs — without the
        // diffs; the confirmation has said what changed, and `zcf plan` still shows all.
        else renderer.current.planSteps(view.plan, previews)
        if (!changes && view.plan.tools.length > 0) renderer.current.line(t('cli.nothingToDo'))
        setPhase('running')
        if (!changes) {
          setPhase('done')
          return
        }
        const outcome = await service.apply(event => renderer.current?.stepResult(event.tool, event.result))
        renderer.current.summary(shownPlan.current, outcome.results, outcome.backupDir)
      } catch (error) {
        output.write(`${t('tui.apply.failed', { message: errorText(error, t) })}\n`)
      }
      setPhase('done')
    })()
  }

  // The confirmation's two halves: what changed in the config, and what applying installs.
  const changes = summarizeChanges(base, draft)
  const picks = installPicks(draft, detected)

  const maxScroll = Math.max(0, lines.length - height)
  const top = phase === 'running' ? maxScroll : Math.min(scroll, maxScroll)
  const outputRef = useRef<DOMElement | null>(null)

  // The wheel scrolls the run output; presses outside the output are not ours. The
  // scroll math reads the latest state inside the setter, so the subscription itself
  // never re-arms mid-burst and drops a wheel event between renders.
  useEffect(() => {
    if (!active) return undefined
    return onMousePress(press => {
      const metrics = outputRef.current ? measureElement(outputRef.current) : undefined
      if (!metrics) return
      const direction = wheelDirection(press)
      if (!direction || !contains(metrics, press)) return
      if (press.row - 1 < metrics.y || press.row - 1 >= metrics.y + metrics.height) return
      if (direction === 'up') setScroll(current => Math.max(0, current - 1))
      else setScroll(current => Math.min(Math.max(0, lines.length - height), current + 1))
    })
  }, [active, lines.length, height])

  useInput(
    (input, key) => {
      if (key.escape || key.leftArrow) onClose()
      else if (phase === 'confirm' && key.return) start()
      else if (phase !== 'confirm' && (key.upArrow || input === 'k')) setScroll(Math.max(0, top - 1))
      else if (phase !== 'confirm' && (key.downArrow || input === 'j')) setScroll(Math.min(maxScroll, top + 1))
      else if (phase !== 'confirm' && key.pageUp) setScroll(Math.max(0, top - height))
      else if (phase !== 'confirm' && (key.pageDown || input === ' ')) setScroll(Math.min(maxScroll, top + height))
      else if (phase === 'done' && key.return) onClose()
    },
    { isActive: active && phase !== 'running' && phase !== 'planning' },
  )

  if (phase === 'confirm' || phase === 'planning')
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={2} width={58} gap={1}>
        <Text bold color="cyan">
          {t('tui.apply.title')}
        </Text>
        <Text dimColor>{t('tui.apply.confirmHint')}</Text>
        <Box flexDirection="column">
          <Text bold dimColor>
            {t('tui.apply.changes')}
          </Text>
          {changes.length === 0 ? (
            <Text dimColor>{`  ${t('tui.apply.noChanges')}`}</Text>
          ) : (
            changes.map((change: ConfigChange) => (
              <Text key={change.key} wrap="truncate-end">
                {'  '}
                {change.key}
                {change.value !== undefined ? `: ${change.value}` : ''}
              </Text>
            ))
          )}
        </Box>
        <Box flexDirection="column">
          <Text bold dimColor>
            {t('tui.apply.installs')}
          </Text>
          {picks.length === 0 ? (
            <Text dimColor>{`  ${t('tui.apply.noInstalls')}`}</Text>
          ) : (
            picks.map((pick, index) => (
              <Text key={`${pick.kind}-${index}`} wrap="truncate-end">
                {'  '}
                {pick.kind === 'source' && pick.label.startsWith('  ')
                  ? pick.label
                  : `${t(`tui.apply.pick.${pick.kind}`)}: ${pick.label.trim()}`}
                {pick.note === 'installed' ? ` (${t('tui.apply.installed')})` : ''}
                {pick.note === 'all' ? ` (${t('tui.apply.allSkills')})` : ''}
              </Text>
            ))
          )}
        </Box>
        {phase === 'planning' ? (
          <Text dimColor>{t('tui.apply.planning')}</Text>
        ) : (
          <Box justifyContent="center" gap={4}>
            <Text bold color="black" backgroundColor="cyan">
              {` Enter ${t('web.apply')} `}
            </Text>
            <Text dimColor>{` Esc ${t('web.cancel')} `}</Text>
          </Box>
        )}
      </Box>
    )

  // The run takes the whole overlay: a centered window is for confirming, not for
  // output that outgrows it.
  return (
    <Box flexDirection="column" ref={outputRef} paddingX={1} gap={1}>
      <Text bold color="cyan">
        {t('tui.apply.title')}
      </Text>
      {lines.slice(top, top + height).map((line, index) => (
        <Text key={top + index} wrap="truncate-end">
          {line || ' '}
        </Text>
      ))}
      {phase === 'done' && (
        <Box justifyContent="center">
          <Text bold color="black" backgroundColor="cyan">
            {` Enter/Esc ${t('web.close')} `}
          </Text>
        </Box>
      )}
    </Box>
  )
}
