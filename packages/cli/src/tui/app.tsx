import process from 'node:process'

import type { ToolId, ToolStatus } from '@zcf/core'
import { isLanguageSetting, LANGUAGES } from '@zcf/core'
import type { PageId, ZcfService } from '@zcf/ui-kit'
import {
  digitIndex,
  draftIds,
  isDigitKey,
  navRows,
  pageHasIssues,
  PAGE_ROOTS,
  PAGES,
  TOOL_OPTIONS,
  useConfigEditor,
} from '@zcf/ui-kit'
import { type DOMElement, Box, Text, measureElement, useApp, useInput, useStdin, useStdout } from 'ink'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { version } from '../../package.json'
import type { Lang } from '../i18n'
import { createTranslator, errorText, isLang } from '../i18n'
import { tildify } from '../render'
import type { ApplyPhase } from './apply-page'
import { ApplyFlow } from './apply-page'
import { BackupPage } from './backup-page'
import { Header } from './banner'
import { Boot } from './boot'
import { Dialog } from './dialog'
import { GradientFrame } from './frame'
import { FxProvider, useTheme } from './fx/context'
import type { FxOptions } from './fx/detect'
import { resolveFx } from './fx/detect'
import { FillText } from './fx/paint'
import { KeyBar } from './key-bar'
import { attachMouseStdin, contains, onMousePress, publishMousePress, setMouseReporting, wheelDirection } from './mouse'
import type { PageProps } from './pages'
import {
  ExtrasPage,
  McpPage,
  ProviderPage,
  SettingsPage,
  SkillsPage,
  StylesPage,
  ToolsPage,
  WorkflowsPage,
} from './pages'
import { Sidebar } from './sidebar'
import { textWidth } from './text-width'
import { useTerminalColumns } from './use-terminal-columns'
import { useTerminalRows } from './use-terminal-rows'
import { windowRange } from './window'

export interface AppProps {
  service: ZcfService
  /** Language resolved at startup; the config's `language` takes over unless it was pinned. */
  lang: Lang
  /** Whether `--lang` or `ZCF_LANG` set the language, so the config cannot override it. */
  langPinned?: boolean
  home: string
  /**
   * Pins what would otherwise be detected at startup: the colour level and background,
   * whether things move, and the clock animations run on — tests step frames by hand.
   */
  fx?: FxOptions
}

interface Status {
  text: string
  tone: 'info' | 'warning' | 'error'
}

const STATUS_TONE = { info: 'ok', warning: 'warn', error: 'err' } as const

/** How long a config load may take before the boot screen shows; a fast load goes straight to the editor. */
const BOOT_DELAY_MS = 150

/** The sidebar's width, borders included. */
const SIDEBAR_WIDTH = 28

/** The nav column's width, its rule included. */
const NAV_WIDTH = 18

/** The nav column's rows: section headers and digit-prefixed pages, in render order. */
const NAV_ROWS = navRows()

/**
 * Lines the nav column may not claim: the banner box (12) + the status row (1) + the
 * panel's borders (2) + the key bar (1), plus one row of slack — yoga's measured
 * minimum runs a line over that sum, which stayed hidden while the nav never capped.
 * A transient status message takes one more, which at worst hides a windowed nav's
 * bottom arrow for as long as it shows.
 */
const NAV_CHROME = 7

/**
 * The terminal UI: pages on the left, the open page on the right. Edits stay in a
 * draft until the apply key writes them to the config file, key by key, and applies.
 * Colours and motion are worked out once here and shared with every piece below.
 */
export function App(props: AppProps) {
  const { stdout } = useStdout()
  const [fx] = useState(() => resolveFx(props.fx ?? {}, process.env, 'isTTY' in stdout && stdout.isTTY === true))
  return (
    <FxProvider fx={fx}>
      <Editor {...props} clock={fx.clock} />
    </FxProvider>
  )
}

function Editor({
  service,
  lang,
  langPinned = false,
  home,
  clock,
}: AppProps & { clock: ReturnType<typeof resolveFx>['clock'] }) {
  const theme = useTheme()
  const editor = useConfigEditor(service)
  const { exit } = useApp()
  const [uiLang, setUiLang] = useState<Lang>(lang)
  const t = useMemo(() => createTranslator(uiLang), [uiLang])
  // v3 opened on its full-init entry; the walkthrough page plays that part here.
  // v5 has no init walkthrough: the editor opens where the tools are picked.
  const [page, setPage] = useState<PageId>('tools')
  // The confirm-then-run flow the apply key opens over whatever page is showing.
  const [applying, setApplying] = useState(false)
  const [applyPhase, setApplyPhase] = useState<ApplyPhase>()
  // Bumped after each successful apply, replaying the wordmark's sweep.
  const [sweepKey, setSweepKey] = useState(0)
  const [quitOpen, setQuitOpen] = useState(false)
  const [backupDialog, setBackupDialog] = useState(false)
  const [slowLoad, setSlowLoad] = useState(false)
  const [focus, setFocus] = useState<'nav' | 'page'>('nav')
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<Status>()
  const [detected, setDetected] = useState<Partial<Record<ToolId, ToolStatus>>>()
  const terminalRows = useTerminalRows()
  // Wide terminals carry the state on a right sidebar, crush-style; narrower ones keep
  // the one-line header instead, so the page keeps its room — the sidebar only shows
  // where taking 26 columns still leaves the page a full line's worth.
  const columns = useTerminalColumns()
  const wide = columns >= 112
  // How many of the picked tools the machine already has, for the sidebar's count.
  const installedTools =
    editor.status === 'ready'
      ? draftIds(editor.draft.tools).filter(id => {
          const known = TOOL_OPTIONS.find(tool => tool === id)
          return known !== undefined && detected?.[known]?.installed
        }).length
      : 0
  const { stdin } = useStdin()
  const { stdout } = useStdout()

  // The boot screen waits for a slow load only; the timer is gone once the config is in.
  const loading = editor.status === 'loading'
  useEffect(() => {
    if (!loading) return undefined
    const handle = clock.setTimeout(() => setSlowLoad(true), BOOT_DELAY_MS)
    return () => clock.clearTimeout(handle)
  }, [loading, clock])
  const navRef = useRef<DOMElement | null>(null)

  // The nav windows the way a row list does when it outgrows the panel, keeping the
  // open page in view.
  const navCursor = NAV_ROWS.findIndex(row => row.kind === 'page' && row.id === page)
  const {
    capped: navCapped,
    start: navStart,
    size: navSize,
  } = windowRange(NAV_ROWS.length, navCursor, Math.max(4, terminalRows - NAV_CHROME))
  const navShown = NAV_ROWS.slice(navStart, navStart + navSize)

  // Mouse reporting for the whole UI: turn it on, parse what the terminal sends, restore on exit.
  useEffect(() => {
    setMouseReporting(stdout, true)
    const detach = attachMouseStdin(stdin, publishMousePress)
    return () => {
      detach()
      setMouseReporting(stdout, false)
    }
  }, [stdin, stdout])

  // Clicking a nav entry opens its page; the wheel moves the page choice. Both only act
  // when the press lands on the nav column, so lists keep the rest of the screen.
  useEffect(() => {
    return onMousePress(press => {
      const nav = navRef.current
      if (!nav) return
      const metrics = measureElement(nav)
      if (!contains(metrics, press)) return
      const direction = wheelDirection(press)
      if (direction) {
        const index = PAGES.indexOf(page)
        const next = direction === 'up' ? Math.max(0, index - 1) : Math.min(PAGES.length - 1, index + 1)
        setPage(PAGES[next]!)
        return
      }
      // Walk the flattened rows, each one line; section headers are not clickable, and
      // the top arrow, when drawn, takes the first line.
      const offset = press.row - 1 - metrics.y - (navStart > 0 ? 1 : 0)
      if (offset < 0 || offset >= navShown.length) return
      const target = NAV_ROWS[navStart + offset]
      if (target?.kind === 'page') {
        setPage(target.id)
        setFocus('page')
      }
    })
  }, [page, navStart, navShown.length])

  const loadPresets = useCallback(() => service.presets(), [service])

  // The config's `language` wins over the detected locale, unless --lang or ZCF_LANG pinned it.
  // The header's switch writes the field at once, so the effect below follows what it saved.
  const draftLanguage = editor.status === 'ready' ? editor.draft.language : undefined
  const languageSetting = isLanguageSetting(draftLanguage) ? draftLanguage : 'auto'
  useEffect(() => {
    if (langPinned) return
    const next = isLang(draftLanguage) ? draftLanguage : lang
    if (next !== uiLang) setUiLang(next)
  }, [draftLanguage, lang, langPinned, uiLang])

  useEffect(() => {
    service.detect(TOOL_OPTIONS).then(setDetected, () => setDetected({}))
  }, [service])

  const switchLanguage = () => {
    const position = LANGUAGES.indexOf(languageSetting)
    const next = LANGUAGES[(position + 1) % LANGUAGES.length]!
    editor
      .saveField(['language'], next)
      .catch((error: unknown) =>
        setStatus({ text: t('tui.saveFailed', { message: errorText(error, t) }), tone: 'error' }),
      )
  }

  const save = async (): Promise<boolean> => {
    if (!editor.validation.valid) {
      const [first] = editor.validation.issues
      const detail = first ? `${first.path ? `${first.path}: ` : ''}${t(first.message.key, first.message.params)}` : ''
      setStatus({ text: t('tui.invalid', { count: editor.validation.issues.length, first: detail }), tone: 'warning' })
      return false
    }
    try {
      const saved = await editor.save()
      if (!saved) return false
      return true
    } catch (error) {
      setStatus({
        text: t('tui.saveFailed', { message: errorText(error, t) }),
        tone: 'error',
      })
      return false
    }
  }

  useInput(
    (input, key) => {
      // One key applies: the confirm-then-run flow opens over whatever page is showing.
      if (input?.toLowerCase() === 'a' && editor.status === 'ready') {
        setApplying(true)
        return
      }
      // The header's language switch works on every page; a pinned --lang keeps the language.
      // The hint shows an uppercase L, so Shift+L switches too.
      if (input?.toLowerCase() === 'l' && !langPinned && editor.status === 'ready') {
        switchLanguage()
        return
      }
      if (focus !== 'nav' && editor.status === 'ready') return
      // A digit jumps to the page it names.
      if (input && isDigitKey(input)) {
        const target = PAGES[digitIndex(input)]
        if (target) setPage(target)
        return
      }
      const index = PAGES.indexOf(page)
      // Unapplied edits ask first; the dialog opens on Stay, and a second q still quits.
      if (input === 'q') {
        if (!editor.dirty) exit()
        else setQuitOpen(true)
      } else if (key.upArrow || input === 'k') setPage(PAGES[Math.max(0, index - 1)]!)
      else if (key.downArrow || input === 'j') setPage(PAGES[Math.min(PAGES.length - 1, index + 1)]!)
      else if (key.return || key.rightArrow) setFocus('page')
    },
    { isActive: !editing && !applying && !quitOpen && !backupDialog },
  )

  if (editor.status === 'loading') return slowLoad ? <Boot t={t} rows={terminalRows} /> : null
  if (editor.status === 'broken') {
    return (
      <Box flexDirection="column">
        <Text {...theme.tone('err')}>{t('tui.broken', { path: tildify(editor.path, home) })}</Text>
        {editor.loadIssues.map(issue => (
          <Text key={`${issue.path}:${issue.message.key}`}>
            {`  - ${issue.path ? `${issue.path}: ` : ''}${t(issue.message.key, issue.message.params)}`}
          </Text>
        ))}
        <Text {...theme.tone('dim')}>{t('tui.brokenHint')}</Text>
      </Box>
    )
  }

  const onPage = focus === 'page'
  const props: PageProps = {
    editor,
    t,
    active: onPage,
    onBack: () => setFocus('nav'),
    onEditing: setEditing,
  }
  // The bar's two halves: how to move on the left, what to do on the right, cc-switch
  // style. The L switch only shows while it works; --lang or ZCF_LANG pins the language.
  // A dialog, a run or a result card puts its own keys there instead.
  const keysSuffix = langPinned ? 'NoLang' : ''
  const dialogOpen = quitOpen || backupDialog || (applying && (applyPhase === undefined || applyPhase === 'confirm'))
  const [navHalf, actHalf] = editing
    ? [undefined, 'tui.bar.editing']
    : dialogOpen || (applying && applyPhase === 'planning')
      ? ['tui.bar.dialog', 'tui.bar.dialogAct']
      : applying && applyPhase === 'running'
        ? [undefined, 'tui.bar.running']
        : applying && applyPhase === 'done'
          ? ['tui.bar.result', 'tui.bar.resultAct']
          : [!onPage ? `tui.bar.nav${keysSuffix}` : `tui.bar.page${keysSuffix}`, `tui.bar.act${keysSuffix}`]
  const busy = applying && (applyPhase === 'planning' || applyPhase === 'running')
  const panelWidth = Math.max(40, columns - (wide ? SIDEBAR_WIDTH : 0))
  // The page area: inside the panel's sides, beside the nav, after the page's own padding.
  const pageWidth = panelWidth - 2 - NAV_WIDTH - 1
  const panelTitle = applying ? t('tui.panel.apply') : t(`tui.page.${page}`)
  const closeApply = () => {
    setApplying(false)
    setApplyPhase(undefined)
  }

  return (
    // The column fills the terminal height, so the panel's border always reaches the bottom.
    <Box flexDirection="column" height={terminalRows}>
      {!wide && (
        <Header
          t={t}
          version={version}
          path={tildify(editor.path, home)}
          language={t(`language.${languageSetting}`)}
          langHint={langPinned ? '' : ' (L)'}
          dirty={editor.dirty}
          columns={columns}
        />
      )}
      <Box flexDirection="row" flexGrow={1} marginTop={1}>
        <GradientFrame
          width={panelWidth}
          flexGrow={1}
          bright={onPage || applying || quitOpen}
          titleWidth={(wide ? 6 : 0) + textWidth(panelTitle)}
          title={
            <Text>
              {wide && <FillText text=" zcf " />}
              {wide && ' '}
              <Text bold>{panelTitle}</Text>
            </Text>
          }
        >
          <Box flexDirection="row" flexGrow={1}>
            <Box
              ref={navRef}
              flexDirection="column"
              width={NAV_WIDTH}
              flexShrink={0}
              borderStyle="single"
              borderTop={false}
              borderBottom={false}
              borderLeft={false}
              borderRightColor={theme.color('faint')}
              borderRightDimColor={!theme.rich}
            >
              {navCapped && navStart > 0 && <Text {...theme.tone('dim')}>{'  ↑'}</Text>}
              {navShown.map(row => {
                // A section header may share its id with one of its pages, so the kind prefixes them apart.
                if (row.kind === 'header')
                  return (
                    <Text key={`header-${row.id}`} {...theme.tone('dim')}>
                      {t(row.labelKey)}
                    </Text>
                  )
                const current = row.id === page
                const roots = PAGE_ROOTS[row.id]
                const broken = roots !== undefined && pageHasIssues(editor.validation.issues, roots)
                const label = `${row.digit ?? ' '} ${t(`tui.page.${row.id}`)}`
                // The chosen page lights up as a whole row: a full gradient bar while the
                // nav has the focus, an accent marker and label while the page under it does.
                if (current && !onPage) {
                  const text = `▌ ${label}${broken ? ' !' : ''}`
                  return (
                    <Box key={`page-${row.id}`}>
                      <FillText text={`${text}${' '.repeat(Math.max(0, NAV_WIDTH - 1 - textWidth(text)))}`} />
                    </Box>
                  )
                }
                return (
                  <Text key={`page-${row.id}`} wrap="truncate-end">
                    {current ? <Text {...theme.tone('accent')}>▌ </Text> : '  '}
                    <Text bold={current} {...(current ? theme.tone('accent') : {})}>
                      {label}
                    </Text>
                    {broken && <Text {...theme.tone('err')}> !</Text>}
                  </Text>
                )
              })}
              {navCapped && navStart + navSize < NAV_ROWS.length && <Text {...theme.tone('dim')}>{'  ↓'}</Text>}
            </Box>
            <Box flexDirection="column" flexGrow={1} paddingLeft={1}>
              {applying && editor.status === 'ready' && (
                <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
                  <ApplyFlow
                    service={service}
                    t={t}
                    home={home}
                    active={applying}
                    width={pageWidth}
                    draft={editor.draft}
                    base={editor.saved}
                    detected={detected ?? {}}
                    save={save}
                    onClose={closeApply}
                    onPhase={setApplyPhase}
                    onApplied={() => setSweepKey(key => key + 1)}
                    onQuit={exit}
                  />
                </Box>
              )}
              {!applying && quitOpen && (
                <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
                  <Dialog
                    width={Math.min(64, pageWidth)}
                    tone="warn"
                    initial={0}
                    active={quitOpen}
                    onCancel={() => setQuitOpen(false)}
                    extra={input => {
                      if (input !== 'q') return false
                      exit()
                      return true
                    }}
                    buttons={[
                      { label: t('tui.button.stay'), run: () => setQuitOpen(false) },
                      {
                        label: t('tui.button.applyFirst'),
                        run: () => {
                          setQuitOpen(false)
                          setApplying(true)
                        },
                      },
                      { label: t('tui.button.quitAnyway'), run: exit, destructive: true },
                    ]}
                  >
                    <Box flexDirection="column">
                      <Text bold {...theme.tone('warn')}>
                        {t('tui.quit.title')}
                      </Text>
                      <Text>{t('tui.quit.body')}</Text>
                    </Box>
                  </Dialog>
                </Box>
              )}
              {!applying && !quitOpen && page === 'tools' && <ToolsPage {...props} detected={detected} />}
              {!applying && !quitOpen && page === 'provider' && (
                <ProviderPage {...props} lang={uiLang} loadPresets={loadPresets} />
              )}
              {!applying && !quitOpen && page === 'mcp' && <McpPage {...props} />}
              {!applying && !quitOpen && page === 'skills' && (
                <SkillsPage {...props} lang={uiLang} searchSkills={service.searchSkills} />
              )}
              {!applying && !quitOpen && page === 'settings' && <SettingsPage {...props} />}
              {!applying && !quitOpen && page === 'workflows' && (
                <WorkflowsPage {...props} lang={uiLang} searchSkills={service.searchSkills} />
              )}
              {!applying && !quitOpen && page === 'styles' && <StylesPage {...props} />}
              {!applying && !quitOpen && page === 'extras' && <ExtrasPage {...props} />}
              {!applying && !quitOpen && page === 'backup' && (
                <BackupPage
                  service={service}
                  t={t}
                  active={onPage}
                  dirty={editor.dirty}
                  onBack={props.onBack}
                  width={pageWidth}
                  onDialog={setBackupDialog}
                />
              )}
            </Box>
          </Box>
        </GradientFrame>
        {wide && (
          <Sidebar
            editor={editor}
            t={t}
            version={version}
            home={home}
            installedTools={installedTools}
            busy={busy}
            sweepKey={sweepKey}
          />
        )}
      </Box>
      <KeyBar left={navHalf ? t(navHalf) : undefined} right={t(actHalf)} />
      {status && <Text {...theme.tone(STATUS_TONE[status.tone])}>{status.text}</Text>}
    </Box>
  )
}
