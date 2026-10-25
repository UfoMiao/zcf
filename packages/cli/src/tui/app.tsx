import type { ToolId, ToolStatus } from '@zcf/core'
import type { PageId, ZcfService } from '@zcf/ui-kit'
import { issuesAt, PAGE_ROOTS, PAGES, TOOL_OPTIONS, useConfigEditor } from '@zcf/ui-kit'
import { Box, Text, useApp, useInput } from 'ink'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { version } from '../../package.json'
import type { Lang } from '../i18n'
import { createTranslator, errorText, isLang } from '../i18n'
import { tildify } from '../render'
import { ApplyPage } from './apply-page'
import { Banner } from './banner'
import type { PageProps } from './pages'
import { McpPage, ProviderPage, SettingsPage, SkillsPage, ToolsPage } from './pages'

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

  const loadPresets = useCallback(() => service.presets(), [service])

  // The config's `language` wins over the detected locale, unless --lang or ZCF_LANG pinned it.
  // Editing the field on the Settings page switches the UI before it is even saved; picking
  // `auto` goes back to the locale detected at startup.
  const draftLanguage = editor.status === 'ready' ? editor.draft.language : undefined
  useEffect(() => {
    if (langPinned) return
    const next = isLang(draftLanguage) ? draftLanguage : lang
    if (next !== uiLang) setUiLang(next)
  }, [draftLanguage, lang, langPinned, uiLang])

  useEffect(() => {
    service.detect(TOOL_OPTIONS).then(setDetected, () => setDetected({}))
  }, [service])

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
      if (focus !== 'nav' && editor.status === 'ready') return
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
  const keys = editing
    ? 'tui.keys.editing'
    : !onPage
      ? 'tui.keys.nav'
      : page === 'apply'
        ? 'tui.keys.apply'
        : 'tui.keys.page'

  return (
    <Box flexDirection="column">
      <Banner t={t} />
      <Box gap={2}>
        <Text dimColor>v{version}</Text>
        <Text dimColor>{tildify(editor.path, home)}</Text>
        {editor.dirty && <Text color="yellow">● {t('tui.unsaved')}</Text>}
      </Box>
      <Box borderStyle="round" borderDimColor>
        <Box flexDirection="column" width={18} paddingRight={1}>
          {PAGES.map(id => {
            const current = id === page
            const roots = PAGE_ROOTS[id]
            const broken = roots !== undefined && issuesAt(editor.validation.issues, roots).length > 0
            return (
              <Text
                key={id}
                color={current ? 'cyan' : undefined}
                bold={current && !onPage}
                dimColor={!current && onPage}
              >
                {current ? '› ' : '  '}
                {t(`tui.page.${id}`)}
                {broken && <Text color="red"> !</Text>}
              </Text>
            )
          })}
        </Box>
        <Box flexDirection="column" flexGrow={1}>
          {page === 'tools' && <ToolsPage {...props} detected={detected} />}
          {page === 'provider' && <ProviderPage {...props} lang={uiLang} loadPresets={loadPresets} />}
          {page === 'mcp' && <McpPage {...props} />}
          {page === 'skills' && <SkillsPage {...props} />}
          {page === 'settings' && <SettingsPage {...props} />}
          {page === 'apply' && (
            <ApplyPage service={service} t={t} home={home} active={onPage} dirty={editor.dirty} onBack={props.onBack} />
          )}
        </Box>
      </Box>
      <Text dimColor>{t(keys)}</Text>
      {status && <Text color={TONE_COLOR[status.tone]}>{status.text}</Text>}
    </Box>
  )
}
