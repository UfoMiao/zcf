import type { FilePreview, PlanStep, StepResult, ToolStatus } from '@zcf/core'
import { ACTOR_NAMES } from '@zcf/core'
import type { ApplyOutcome, ConfigChange, PlanView, ZcfService } from '@zcf/ui-kit'
import { installPicks, isTable, SECRET_KEYS, summarizeChanges } from '@zcf/ui-kit'
import { type DOMElement, Box, Text, measureElement, useInput } from 'ink'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import type { Translate } from '../i18n'
import { errorText } from '../i18n'
import { applyCounts, hasWork, maskSecrets, Renderer, secretsOf, tildify } from '../render'
import type { DialogButton } from './dialog'
import { Dialog, dialogWidth } from './dialog'
import { useOneShot, useTheme } from './fx/context'
import { Spinner, Hatch, Wave } from './fx/glyphs'
import { GradientText, Paint } from './fx/paint'
import { contains, onMousePress, wheelDirection } from './mouse'
import { textWidth, wrappedLines } from './text-width'
import { useTerminalRows } from './use-terminal-rows'

export type ApplyPhase = 'confirm' | 'planning' | 'running' | 'done'

/** Where a step stands in the run view: not reached yet, or how it ended. */
type StepState = 'pending' | StepResult['status']

/** How a finished run ended, which picks the result card. */
type Ending = 'applied' | 'nothing' | 'noTools' | 'failed' | 'error'

/** Frames of the success card's one shimmer pass. */
const SHIMMER_FRAMES = 12

/** Lines the run view may not claim: the app's header, edges and key bar, its own title and progress rows. */
const RUN_CHROME = 9

/**
 * Lines the confirmation may not give its two lists: the app's header, edges, key bar
 * and a status line, the dialog's cleared cell, frame and gaps, its title and hint,
 * the two list headings and the button row.
 */
const CONFIRM_CHROME = 18

/** Lines a list of `count` rows takes with `shown` of them drawn: a cut list adds its "more" note; an empty one its placeholder. */
function listLines(count: number, shown: number): number {
  return count === 0 ? 1 : shown + (shown < count ? 1 : 0)
}

/**
 * How many rows of each confirmation list fit in `budget` lines, taking rows from the
 * longer list first, so a short terminal keeps the title and the buttons in view.
 */
export function fitLists(first: number, second: number, budget: number): [number, number] {
  let a = first
  let b = second
  while (listLines(first, a) + listLines(second, b) > budget && (a > 0 || b > 0)) {
    if (a >= b) a -= 1
    else b -= 1
  }
  return [a, b]
}

/** Width of the run view's progress bar. */
const BAR = 30

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

/**
 * The secret values a draft holds — every string under an API key, an MCP server's
 * env or its headers, wherever it sits (the provider, the profiles, the servers) —
 * read leniently, since a draft may not be a valid config. An error from planning or
 * applying can quote them before the plan has listed any secrets.
 */
function draftSecrets(value: unknown, secret = false): string[] {
  if (typeof value === 'string') return secret ? [value] : []
  if (Array.isArray(value)) return value.flatMap(item => draftSecrets(item, secret))
  if (!isTable(value)) return []
  return Object.entries(value).flatMap(([key, part]) => draftSecrets(part, secret || SECRET_KEYS.has(key)))
}

/** A fallback step only shows once it ran: it stands in for a step that failed, and usually never runs. */
function hidden(step: PlanStep, state: StepState): boolean {
  return step.kind === 'command' && step.fallback === true && (state === 'pending' || state === 'skipped')
}

/** The glyph a finished or waiting step shows; a running one gets the spinner instead. */
function StepGlyph({ state }: { state: StepState }) {
  const theme = useTheme()
  if (state === 'done') return <Text {...theme.tone('ok')}>✓</Text>
  if (state === 'unchanged') return <Text {...theme.tone('dim')}>·</Text>
  if (state === 'skipped') return <Text {...theme.tone('dim')}>-</Text>
  if (state === 'failed') return <Text {...theme.tone('err')}>✗</Text>
  return <Text {...theme.tone('dim')}>○</Text>
}

/** The progress bar under the run's title: filled by finished steps, never by time. */
function Progress({ done, total, t }: { done: number; total: number; t: Translate }) {
  const theme = useTheme()
  // Only drawn once a plan has steps, so `total` is never 0.
  const filled = Math.round((BAR * done) / total)
  return (
    <Box gap={2}>
      <Text>
        <Paint text={'━'.repeat(filled)} colors={theme.gradient(BAR)} />
        <Text {...theme.tone('faint')}>{'─'.repeat(BAR - filled)}</Text>
      </Text>
      <Text {...theme.tone('dim')}>{t('tui.run.steps', { done, total })}</Text>
    </Box>
  )
}

export interface ApplyFlowProps {
  service: ZcfService
  t: Translate
  home: string
  active: boolean
  /** Columns the flow may take: the page area beside the nav. */
  width: number
  /** The draft about to be saved, and the config it replaces. */
  draft: Record<string, unknown>
  base: Record<string, unknown> | undefined
  /** What the machine already has, so the confirmation can tell install from configure. */
  detected: Partial<Record<string, ToolStatus>>
  /** Saves the draft before planning; resolves false when it refused an invalid one. */
  save: () => Promise<boolean>
  onClose: () => void
  /** Told each time the flow moves on, so the app can set its key bar and sidebar. */
  onPhase?: (phase: ApplyPhase) => void
  /** Called once a run applied without a failure. */
  onApplied?: () => void
  onQuit?: () => void
}

/**
 * The confirm-then-run flow behind the apply key. The confirmation says what changed
 * in the config and what will be installed — never a diff — and Apply saves, plans and
 * applies. The run lists every step of the plan up front and ticks each one off as its
 * event arrives; a result card with buttons closes it.
 */
export function ApplyFlow({
  service,
  t,
  home,
  active,
  width,
  draft,
  base,
  detected,
  save,
  onClose,
  onPhase,
  onApplied,
  onQuit,
}: ApplyFlowProps) {
  const theme = useTheme()
  const [phase, setPhase] = useState<ApplyPhase>('confirm')
  const [view, setView] = useState<PlanView>()
  const [states, setStates] = useState<StepState[][]>([])
  const [details, setDetails] = useState<Record<string, string>>({})
  const [outcome, setOutcome] = useState<ApplyOutcome>()
  const [error, setError] = useState<string>()
  const [scroll, setScroll] = useState(0)
  // Until a plan names its secrets, the renderer masks none of its own; the draft's are masked apart.
  const renderer = useRef(new Renderer({ write: () => {} }, t, [], home))
  const outputRef = useRef<DOMElement | null>(null)
  const rows = useTerminalRows()

  useEffect(() => {
    onPhase?.(phase)
  }, [phase])

  const settle = (toolIndex: number, index: number, result: StepResult) => {
    setStates(current =>
      current.map((steps, at) =>
        at === toolIndex ? steps.map((state, step) => (step === index ? result.status : state)) : steps,
      ),
    )
    if (result.status === 'failed' && result.detail)
      setDetails(current => ({ ...current, [`${toolIndex}:${index}`]: result.detail! }))
  }

  const start = () => {
    void (async () => {
      // A refused save stays on the confirmation — the planning phase only starts once
      // there is a saved config to plan, so Esc works while the refusal lands. What the
      // last run showed stays up until then too: a retry still saving keeps its card.
      if (!(await save())) return
      setScroll(0)
      setOutcome(undefined)
      setError(undefined)
      setDetails({})
      setPhase('planning')
      try {
        const planned = await service.plan()
        renderer.current = new Renderer({ write: () => {} }, t, planned.secrets, home)
        const previews = previewMap(planned)
        const changes = hasWork(planned.plan, previews)
        setView(planned)
        // Nothing to do means every step is a file already as it should be.
        setStates(planned.plan.tools.map(toolPlan => toolPlan.steps.map(() => (changes ? 'pending' : 'unchanged'))))
        if (!changes || planned.plan.tools.length === 0) {
          setPhase('done')
          return
        }
        setPhase('running')
        const tools = planned.plan.tools.map(toolPlan => toolPlan.tool)
        const result = await service.apply(event => {
          const toolIndex = tools.indexOf(event.tool)
          // An event always names a tool of the plan it came from.
          settle(toolIndex, event.index, event.result)
        })
        // The outcome is the record: it fills in any step whose event never arrived.
        for (const [toolIndex, toolPlan] of planned.plan.tools.entries()) {
          const toolResult = result.results.find(item => item.tool === toolPlan.tool)
          for (const stepResult of toolResult?.steps ?? []) {
            const index = toolPlan.steps.indexOf(stepResult.step)
            settle(toolIndex, index, stepResult)
          }
        }
        setOutcome(result)
        if (result.results.every(toolResult => toolResult.ok)) onApplied?.()
      } catch (failure) {
        // The error may quote a secret: mask what the plan named, and what the draft holds.
        const message = t('tui.apply.failed', { message: errorText(failure, t) })
        const planned = renderer.current.mask(message)
        setError(maskSecrets(planned, secretsOf(draftSecrets(draft))))
      }
      setPhase('done')
    })()
  }

  const ending: Ending | undefined =
    phase !== 'done'
      ? undefined
      : error !== undefined
        ? 'error'
        : !view || view.plan.tools.length === 0
          ? 'noTools'
          : !outcome
            ? 'nothing'
            : outcome.results.some(result => !result.ok)
              ? 'failed'
              : 'applied'

  const shimmer = useOneShot(SHIMMER_FRAMES, outcome, ending === 'applied')

  // ---- The run's lines: every tool, its notices and its steps, in plan order. ----
  const plan = view?.plan
  const mask = (text: string) => renderer.current.mask(text)
  const lines: { key: string; node: ReactNode }[] = []
  let resolved = 0
  let total = 0
  if (plan) {
    const render = renderer.current
    const titles = plan.tools.flatMap(toolPlan =>
      toolPlan.steps.map(step => textWidth(mask(render.message(step.title)))),
    )
    const titleColumn = Math.min(Math.max(10, ...titles) + 2, Math.max(16, Math.floor(width / 2)))
    for (const [toolIndex, toolPlan] of plan.tools.entries()) {
      const toolStates = states[toolIndex]!
      total += toolPlan.steps.length
      resolved += toolStates.filter(state => state !== 'pending').length
      const failed = toolStates.includes('failed')
      const toolResult = outcome?.results.find(result => result.tool === toolPlan.tool)
      const pendingAt = toolStates.findIndex(
        (state, index) => state === 'pending' && !hidden(toolPlan.steps[index]!, state),
      )
      // A tool runs while any of its steps is still pending — a fallback included, which
      // runs in a failed step's place. Its outcome, once in, has the last word: a tool
      // that recovered through its fallback is done, though the failed step keeps its ✗.
      const running = phase === 'running' && toolStates.includes('pending')
      const ok = toolResult ? toolResult.ok : !failed && pendingAt < 0
      const broken = toolResult ? !toolResult.ok : failed && !running
      if (toolIndex > 0) lines.push({ key: `gap-${toolIndex}`, node: <Text> </Text> })
      lines.push({
        key: `tool-${toolIndex}`,
        node: (
          <Text>
            <Text bold>{ACTOR_NAMES[toolPlan.tool]}</Text>
            {'  '}
            {running ? (
              <Wave width={4} />
            ) : broken ? (
              <Text {...theme.tone('err')}>✗</Text>
            ) : ok && toolStates.length > 0 ? (
              <Text {...theme.tone('ok')}>✓</Text>
            ) : null}
          </Text>
        ),
      })
      for (const [index, notice] of toolPlan.notices.entries())
        lines.push({
          key: `notice-${toolIndex}-${index}`,
          node: (
            <Text wrap="truncate-end" {...theme.tone(notice.level === 'warning' ? 'warn' : 'dim')}>
              {`  ${notice.level === 'warning' ? '!' : 'i'} ${mask(render.message(notice.message))}`}
            </Text>
          ),
        })
      if (toolPlan.steps.length === 0 && toolPlan.notices.length === 0)
        lines.push({
          key: `empty-${toolIndex}`,
          node: <Text {...theme.tone('dim')}>{`  ${t('cli.nothingToDo')}`}</Text>,
        })
      for (const [index, step] of toolPlan.steps.entries()) {
        // After a failure the tool's remaining steps never run: once the run is over they read as skipped.
        const raw = toolStates[index]!
        const state: StepState = raw === 'pending' && failed && phase === 'done' ? 'skipped' : raw
        if (hidden(step, state)) continue
        // The spinner sits on the step running now; after a failure only a hidden fallback runs.
        const current = running && !failed && index === pendingAt
        const target = state === 'unchanged' ? `(${t('cli.unchanged')})` : mask(render.stepTarget(step))
        lines.push({
          key: `step-${toolIndex}-${index}`,
          node: (
            <Box>
              <Box width={titleColumn + 4} flexShrink={0}>
                <Text
                  wrap="truncate-end"
                  bold={current}
                  {...(state === 'pending' && !current ? theme.tone('dim') : {})}
                >
                  {'  '}
                  {current ? <Spinner /> : <StepGlyph state={state} />} {mask(render.message(step.title))}
                </Text>
              </Box>
              <Text wrap="truncate-end" {...theme.tone('dim')}>
                {target}
              </Text>
            </Box>
          ),
        })
        const detail = details[`${toolIndex}:${index}`]
        if (state === 'failed' && detail)
          for (const [at, text] of detail.split('\n').slice(0, 3).entries())
            lines.push({
              key: `detail-${toolIndex}-${index}-${at}`,
              node: (
                <Text wrap="truncate-end" {...theme.tone('err')}>
                  {`      ${mask(text)}`}
                </Text>
              ),
            })
      }
    }
  }

  // The result card under the list: what happened, and where to go from here.
  const counts = plan && outcome ? applyCounts(plan, outcome.results) : undefined
  const firstFailure = outcome?.results.find(result => !result.ok)
  const failedStep = firstFailure?.steps.find(step => step.status === 'failed')
  const back: DialogButton = { label: t('tui.button.back'), run: onClose }
  const quit: DialogButton = { label: t('tui.button.quit'), run: () => onQuit?.() }
  const retry: DialogButton = { label: t('tui.button.retry'), run: start }
  const cardButtons = ending === 'failed' || ending === 'error' ? [retry, back] : [back, quit]
  const cardWidth = Math.min(64, width - 2)
  // The card's height: its frame's edges, the gap and the button row, one line for its
  // headline, one for the backup path, and as many as the failure note wraps to inside
  // the frame's sides and padding — the list above gives up exactly that much.
  const cardText =
    ending === 'failed'
      ? wrappedLines(t('tui.result.others'), cardWidth - 6)
      : ending === 'applied' && counts?.backedUp
        ? 1
        : 0
  const cardHeight = ending === undefined ? 0 : 5 + cardText
  const height = Math.max(3, rows - RUN_CHROME - cardHeight)
  const maxScroll = Math.max(0, lines.length - height)
  const top = Math.min(scroll, maxScroll)

  // The wheel scrolls the run output; presses outside the output are not ours. The
  // scroll math reads the latest state inside the setter, so the subscription itself
  // never re-arms mid-burst and drops a wheel event between renders.
  useEffect(() => {
    if (!active || phase === 'confirm' || phase === 'planning') return undefined
    return onMousePress(press => {
      const metrics = outputRef.current ? measureElement(outputRef.current) : undefined
      if (!metrics) return
      const direction = wheelDirection(press)
      if (!direction || !contains(metrics, press)) return
      if (press.row - 1 < metrics.y || press.row - 1 >= metrics.y + metrics.height) return
      if (direction === 'up') setScroll(current => Math.max(0, Math.min(current, maxScroll) - 1))
      else setScroll(current => Math.min(maxScroll, current + 1))
    })
  }, [active, phase, maxScroll])

  // ↑↓, PgUp/PgDn and Space scroll the run while it goes and after; the card's buttons
  // take ←→, Tab, Enter and Esc, so the two never claim the same key.
  useInput(
    (input, key) => {
      if (key.upArrow || input === 'k') setScroll(Math.max(0, top - 1))
      else if (key.downArrow || input === 'j') setScroll(Math.min(maxScroll, top + 1))
      else if (key.pageUp) setScroll(Math.max(0, top - height))
      else if (key.pageDown || input === ' ') setScroll(Math.min(maxScroll, top + height))
    },
    { isActive: active && (phase === 'running' || phase === 'done') },
  )

  if (phase === 'confirm' || phase === 'planning') {
    const changes = summarizeChanges(base, draft)
    const picks = installPicks(draft, detected)
    const confirmWidth = dialogWidth(58, width)
    const [changesShown, picksShown] = fitLists(changes.length, picks.length, rows - CONFIRM_CHROME)
    const more = (count: number) => <Text {...theme.tone('dim')}>{`  ${t('tui.apply.more', { count })}`}</Text>
    return (
      <Dialog
        width={confirmWidth}
        initial={1}
        active={active}
        onCancel={onClose}
        buttons={
          phase === 'confirm'
            ? [
                { label: t('tui.button.cancel'), run: onClose },
                { label: t('tui.button.apply'), run: start },
              ]
            : undefined
        }
        footer={
          <Text>
            <Wave width={6} /> <Text {...theme.tone('dim')}>{t('tui.apply.planning')}</Text>
          </Text>
        }
      >
        <Box flexDirection="column">
          <Text bold {...theme.tone('accent')}>
            {t('tui.apply.title')} <Hatch width={8} flowing={phase === 'planning'} />
          </Text>
          <Text {...theme.tone('dim')}>{t('tui.apply.confirmHint')}</Text>
        </Box>
        <Box flexDirection="column">
          <Text bold {...theme.tone('dim')}>
            {t('tui.apply.changes')}
          </Text>
          {changes.length === 0 ? (
            <Text {...theme.tone('dim')}>{`  ${t('tui.apply.noChanges')}`}</Text>
          ) : (
            changes.slice(0, changesShown).map((change: ConfigChange) => (
              <Text key={change.key} wrap="truncate-end">
                {'  '}
                <Text {...theme.tone('warn')}>~</Text> {change.key}
                {change.value !== undefined ? `: ${change.value}` : ''}
              </Text>
            ))
          )}
          {changesShown < changes.length && more(changes.length - changesShown)}
        </Box>
        <Box flexDirection="column">
          <Text bold {...theme.tone('dim')}>
            {t('tui.apply.installs')}
          </Text>
          {picks.length === 0 ? (
            <Text {...theme.tone('dim')}>{`  ${t('tui.apply.noInstalls')}`}</Text>
          ) : (
            picks.slice(0, picksShown).map((pick, index) => {
              // A source's skills are listed under it, indented, without a marker of their own.
              if (pick.kind === 'source' && pick.label.startsWith('  '))
                return (
                  <Text key={`${pick.kind}-${index}`} wrap="truncate-end">
                    {`  ${pick.label}`}
                  </Text>
                )
              const installed = pick.note === 'installed'
              return (
                <Text key={`${pick.kind}-${index}`} wrap="truncate-end">
                  {'  '}
                  {installed ? <Text {...theme.tone('ok')}>✓</Text> : <Text {...theme.tone('accent')}>+</Text>}{' '}
                  {`${t(`tui.apply.pick.${pick.kind}`)}: ${pick.label.trim()}`}
                  {installed && <Text {...theme.tone('dim')}>{` (${t('tui.apply.installed')})`}</Text>}
                  {pick.note === 'all' ? ` (${t('tui.apply.allSkills')})` : ''}
                </Text>
              )
            })
          )}
          {picksShown < picks.length && more(picks.length - picksShown)}
        </Box>
      </Dialog>
    )
  }

  const appliedText = counts ? t('tui.result.applied', { done: counts.done, unchanged: counts.unchanged }) : ''
  return (
    <Box alignSelf="stretch" flexDirection="column" paddingX={1} flexGrow={1}>
      <Text bold {...theme.tone('accent')}>
        {t('tui.apply.title')} <Hatch width={10} flowing={phase === 'running'} />
      </Text>
      {total > 0 && <Progress done={resolved} total={total} t={t} />}
      <Box ref={outputRef} flexDirection="column" marginTop={1} height={height} overflow="hidden">
        {lines.slice(top, top + height).map(line => (
          <Box key={line.key}>{line.node}</Box>
        ))}
      </Box>
      {ending && (
        <Dialog
          // A new ending is a new card: its focus starts on that card's safe choice.
          key={ending}
          width={cardWidth}
          tone={ending === 'failed' || ending === 'error' ? 'err' : ending === 'noTools' ? 'warn' : 'accent'}
          clear={false}
          buttons={cardButtons}
          initial={ending === 'failed' || ending === 'error' ? 1 : 0}
          active={active}
          onCancel={onClose}
          verticalMoves={false}
        >
          <Box flexDirection="column">
            {ending === 'applied' && (
              <Text bold wrap="truncate-end">
                <Text {...theme.tone('ok')}>✓ </Text>
                {theme.rich && shimmer !== undefined ? (
                  <GradientText
                    text={appliedText}
                    sweep={Math.round((shimmer * (textWidth(appliedText) + 8)) / SHIMMER_FRAMES) - 4}
                  />
                ) : (
                  <Text {...theme.tone('accent')}>{appliedText}</Text>
                )}
              </Text>
            )}
            {ending === 'applied' && counts?.backedUp && outcome && (
              <Text wrap="truncate-end" {...theme.tone('dim')}>
                {t('tui.result.backup', { path: tildify(outcome.backupDir, home) })}
              </Text>
            )}
            {ending === 'nothing' && <Text {...theme.tone('ok')}>{`✓ ${t('cli.nothingToDo')}`}</Text>}
            {ending === 'noTools' && <Text {...theme.tone('warn')}>{`! ${t('tui.apply.noTools')}`}</Text>}
            {ending === 'error' && (
              <Text wrap="truncate-end" {...theme.tone('err')}>
                {`✗ ${error ?? ''}`}
              </Text>
            )}
            {ending === 'failed' && firstFailure && (
              <>
                <Text bold wrap="truncate-end" {...theme.tone('err')}>
                  {`✗ ${t('tui.result.failed', {
                    count: outcome?.results.filter(result => !result.ok).length ?? 0,
                    tool: ACTOR_NAMES[firstFailure.tool],
                    reason: mask(
                      failedStep?.detail?.split('\n')[0] ??
                        (failedStep ? renderer.current.message(failedStep.step.title) : ''),
                    ),
                  })}`}
                </Text>
                <Text {...theme.tone('dim')}>{t('tui.result.others')}</Text>
              </>
            )}
          </Box>
        </Dialog>
      )}
    </Box>
  )
}
