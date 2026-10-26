import type { FilePreview, Plan, PlanStep } from '@zcf/core'
import type { PlanView, ZcfService } from '@zcf/ui-kit'
import { type DOMElement, Box, Text, measureElement, useInput } from 'ink'
import { useEffect, useRef, useState } from 'react'

import type { Translate } from '../i18n'
import { errorText } from '../i18n'
import { hasWork, Renderer } from '../render'
import { contains, onMousePress, wheelDirection } from './mouse'
import { useTerminalRows } from './use-terminal-rows'

type Phase = 'waiting' | 'planning' | 'ready' | 'applying' | 'done'

export interface ApplyPageProps {
  service: ZcfService
  t: Translate
  home: string
  active: boolean
  /** Unsaved changes; the plan always shows the saved config. */
  dirty: boolean
  onBack: () => void
}

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

/**
 * Shows the plan for the saved config with the same output as `zcf plan`, secrets
 * masked, and applies it on Enter, listing each step as it finishes.
 */
export function ApplyPage({ service, t, home, active, dirty, onBack }: ApplyPageProps) {
  const [phase, setPhase] = useState<Phase>('waiting')
  const [lines, setLines] = useState<string[]>([])
  const [work, setWork] = useState(false)
  const [scroll, setScroll] = useState(0)
  const renderer = useRef<Renderer>(undefined)
  // The plan the renderer last showed, so the apply summary can tell skipped tools apart.
  const shownPlan = useRef<Plan>({ tools: [] })
  const height = Math.max(5, useTerminalRows() - 9)

  const output = { write: (text: string) => setLines(current => [...current, ...text.replace(/\n$/, '').split('\n')]) }

  const plan = () => {
    setPhase('planning')
    setLines([])
    setScroll(0)
    service.plan().then(
      view => {
        renderer.current = new Renderer(output, t, view.secrets, home)
        shownPlan.current = view.plan
        const previews = previewMap(view)
        const changes = hasWork(view.plan, previews)
        if (view.plan.tools.length === 0) renderer.current.line(t('tui.apply.noTools'))
        else renderer.current.plan(view.plan, previews)
        if (!changes && view.plan.tools.length > 0) renderer.current.line(t('cli.nothingToDo'))
        setWork(changes)
        setPhase('ready')
      },
      (error: unknown) => {
        setLines([t('tui.apply.failed', { message: errorText(error, t) })])
        setPhase('done')
      },
    )
  }

  // Plan when the page opens on a saved config, and again after each save.
  useEffect(() => {
    if (!dirty) plan()
    else setPhase('waiting')
  }, [dirty])

  const apply = () => {
    const current = renderer.current
    if (!current) return
    setPhase('applying')
    current.line()
    current.line(t('tui.apply.applying'))
    service
      .apply(event => current.stepResult(event.tool, event.result))
      .then(
        outcome => current.summary(shownPlan.current, outcome.results, outcome.backupDir),
        (error: unknown) => current.line(t('cli.unexpectedError', { message: errorText(error, t) })),
      )
      .finally(() => setPhase('done'))
  }

  const maxScroll = Math.max(0, lines.length - height)
  // While applying, follow the newest lines.
  const top = phase === 'applying' ? maxScroll : Math.min(scroll, maxScroll)
  const outputRef = useRef<DOMElement | null>(null)

  // The wheel scrolls the plan output; presses outside the output, such as on the nav, are not ours.
  useEffect(() => {
    if (!active) return undefined
    return onMousePress(press => {
      const metrics = outputRef.current ? measureElement(outputRef.current) : undefined
      if (!metrics) return
      const direction = wheelDirection(press)
      if (!direction || !contains(metrics, press)) return
      if (press.row - 1 < metrics.y || press.row - 1 >= metrics.y + metrics.height) return
      if (direction === 'up') setScroll(Math.max(0, top - 1))
      else setScroll(Math.min(maxScroll, top + 1))
    })
  }, [active, top, maxScroll])

  useInput(
    (input, key) => {
      if (key.escape || key.leftArrow) onBack()
      else if (key.upArrow || input === 'k') setScroll(Math.max(0, top - 1))
      else if (key.downArrow || input === 'j') setScroll(Math.min(maxScroll, top + 1))
      else if (key.pageUp) setScroll(Math.max(0, top - height))
      else if (key.pageDown || input === ' ') setScroll(Math.min(maxScroll, top + height))
      else if (input === 'r' && !dirty) plan()
      else if (key.return && phase === 'ready' && work) apply()
    },
    { isActive: active && phase !== 'applying' && phase !== 'planning' },
  )

  if (dirty) return <Text color="yellow">{t('tui.apply.saveFirst')}</Text>
  if (phase === 'planning') return <Text dimColor>{t('tui.apply.planning')}</Text>
  return (
    <Box ref={outputRef} flexDirection="column">
      {lines.slice(top, top + height).map((line, index) => (
        <Text key={top + index} wrap="truncate-end">
          {line || ' '}
        </Text>
      ))}
    </Box>
  )
}
