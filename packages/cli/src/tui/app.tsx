import type { ToolId, ToolStatus } from '@zcf/core'
import { isLanguageSetting, LANGUAGES } from '@zcf/core'
import type { PageId, ZcfService } from '@zcf/ui-kit'
import {
  digitIndex,
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
import { ApplyPage } from './apply-page'
import { BackupPage } from './backup-page'
import { Banner, FULL_BANNER_ROWS } from './banner'
import { attachMouseStdin, contains, onMousePress, publishMousePress, setMouseReporting, wheelDirection } from './mouse'
import type { PageProps } from './pages'
import {
  AgentsPage,
  ExtrasPage,
  McpPage,
  ProviderPage,
  SettingsPage,
  SkillsPage,
  ToolsPage,
  WorkflowsPage,
} from './pages'
import { useTerminalRows } from './use-terminal-rows'
import { windowRange } from './window'

export interface AppProps {
  service: ZcfService
  /** Language resolved at startup; the config's `language` takes over unless it was pinned. */
  lang: Lang
  /** Whether `--lang` or `ZCF_LANG` set the language, so the config cannot override it. */
  langPinned?: boolean
  home: string
}

interface Status {
  text: string
  tone: 'info' | 'warning' | 'error'
}

const TONE_COLOR = { info: 'green', warning: 'yellow', error: 'red' } as const

/** The nav column's rows: section headers and digit-prefixed pages, in render order. */
const NAV_ROWS = navRows()

/**
 * Lines the nav column may not claim: the banner box (12) + the status row (1) + the
 * panel's borders (2) + the key bar (1), plus one row of slack — yoga's measured
 * minimum runs a line over that sum, which stayed hidden while the nav never capped.
 * A transient status message takes one more, which at worst hides a windowed nav's
 * bottom arrow for as long as it shows.
 */
const NAV_CHROME = 17

/**
 * The terminal UI: pages on the left, the open page on the right. Edits stay in a
 * draft until Ctrl+S writes them to the config file, key by key.
 */
export function App({ service, lang, langPinned = false, home }: AppProps) {
  const editor = useConfigEditor(service)
  const { exit } = useApp()
  const [uiLang, setUiLang] = useState<Lang>(lang)
  const t = useMemo(() => createTranslator(uiLang), [uiLang])
  const [page, setPage] = useState<PageId>('tools')
  const [focus, setFocus] = useState<'nav' | 'page'>('nav')
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<Status>()
  const [quitArmed, setQuitArmed] = useState(false)
  const [detected, setDetected] = useState<Partial<Record<ToolId, ToolStatus>>>()
  const terminalRows = useTerminalRows()
  const { stdin } = useStdin()
  const { stdout } = useStdout()
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

  const save = async () => {
    if (!editor.validation.valid) {
      const [first] = editor.validation.issues
      const detail = first ? `${first.path ? `${first.path}: ` : ''}${t(first.message.key, first.message.params)}` : ''
      setStatus({ text: t('tui.invalid', { count: editor.validation.issues.length, first: detail }), tone: 'warning' })
      return
    }
    try {
      if (await editor.save()) setStatus({ text: t('tui.saved'), tone: 'info' })
    } catch (error) {
      setStatus({
        text: t('tui.saveFailed', { message: errorText(error, t) }),
        tone: 'error',
      })
    }
  }

  useInput(
    (input, key) => {
      if (key.ctrl && input === 's') {
        void save()
        return
      }
      if (input !== 'q') setQuitArmed(false)
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
      if (input === 'q') {
        if (!editor.dirty || quitArmed) exit()
        else {
          setQuitArmed(true)
          setStatus({ text: t('tui.quitUnsaved'), tone: 'warning' })
        }
      } else if (key.upArrow || input === 'k') setPage(PAGES[Math.max(0, index - 1)]!)
      else if (key.downArrow || input === 'j') setPage(PAGES[Math.min(PAGES.length - 1, index + 1)]!)
      else if (key.return || key.rightArrow) setFocus('page')
    },
    { isActive: !editing },
  )

  if (editor.status === 'loading') return <Text dimColor>{t('tui.loading')}</Text>
  if (editor.status === 'broken') {
    return (
      <Box flexDirection="column">
        <Text color="red">{t('tui.broken', { path: tildify(editor.path, home) })}</Text>
        {editor.loadIssues.map(issue => (
          <Text key={`${issue.path}:${issue.message.key}`}>
            {`  - ${issue.path ? `${issue.path}: ` : ''}${t(issue.message.key, issue.message.params)}`}
          </Text>
        ))}
        <Text dimColor>{t('tui.brokenHint')}</Text>
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
  // The hints offer the L switch only while it works; --lang or ZCF_LANG pins the language.
  const keysSuffix = langPinned ? 'NoLang' : ''
  const keys = editing
    ? 'tui.keys.editing'
    : !onPage
      ? `tui.keys.nav${keysSuffix}`
      : page === 'apply'
        ? `tui.keys.apply${keysSuffix}`
        : `tui.keys.page${keysSuffix}`

  return (
    // The column fills the terminal height, so the panel's border always reaches the bottom.
    <Box flexDirection="column" height={terminalRows}>
      <Banner t={t} compact={terminalRows < FULL_BANNER_ROWS} />
      <Box gap={2}>
        <Text dimColor>v{version}</Text>
        <Text dimColor>{tildify(editor.path, home)}</Text>
        {editor.dirty && <Text color="yellow">● {t('tui.unsaved')}</Text>}
        <Text dimColor>
          {t('field.language')}: {t(`language.${languageSetting}`)}
          {!langPinned && <Text bold> (L)</Text>}
        </Text>
      </Box>
      <Box borderStyle="round" borderDimColor flexDirection="row" flexGrow={1}>
        <Box ref={navRef} flexDirection="column" width={18} paddingRight={1}>
          {navCapped && navStart > 0 && <Text dimColor>{'  ↑'}</Text>}
          {navShown.map(row => {
            // A section header may share its id with one of its pages, so the kind prefixes them apart.
            if (row.kind === 'header')
              return (
                <Text key={`header-${row.id}`} dimColor>
                  {t(row.labelKey)}
                </Text>
              )
            const current = row.id === page
            const roots = PAGE_ROOTS[row.id]
            const broken = roots !== undefined && pageHasIssues(editor.validation.issues, roots)
            return (
              <Text
                key={`page-${row.id}`}
                color={current ? 'cyan' : undefined}
                bold={current && !onPage}
                dimColor={!current && onPage}
              >
                {current ? '› ' : '  '}
                {row.digit ?? ' '} {t(`tui.page.${row.id}`)}
                {broken && <Text color="red"> !</Text>}
              </Text>
            )
          })}
          {navCapped && navStart + navSize < NAV_ROWS.length && <Text dimColor>{'  ↓'}</Text>}
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          {page === 'tools' && <ToolsPage {...props} detected={detected} />}
          {page === 'provider' && <ProviderPage {...props} lang={uiLang} loadPresets={loadPresets} />}
          {page === 'mcp' && <McpPage {...props} />}
          {page === 'skills' && <SkillsPage {...props} lang={uiLang} searchSkills={service.searchSkills} />}
          {page === 'settings' && <SettingsPage {...props} />}
          {page === 'workflows' && <WorkflowsPage {...props} lang={uiLang} searchSkills={service.searchSkills} />}
          {page === 'agents' && <AgentsPage {...props} />}
          {page === 'extras' && <ExtrasPage {...props} />}
          {page === 'apply' && (
            <ApplyPage service={service} t={t} home={home} active={onPage} dirty={editor.dirty} onBack={props.onBack} />
          )}
          {page === 'backup' && (
            <BackupPage service={service} t={t} active={onPage} dirty={editor.dirty} onBack={props.onBack} />
          )}
        </Box>
      </Box>
      <Text dimColor>{t(keys)}</Text>
      {status && <Text color={TONE_COLOR[status.tone]}>{status.text}</Text>}
    </Box>
  )
}
