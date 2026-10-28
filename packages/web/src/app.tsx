import type { ToolId, ToolStatus } from '@zcf/core'
// The schema subpath only, never the root: the root pulls the adapters and their Node-only
// runtime into the browser bundle.
import { isLanguageSetting, LANGUAGES } from '@zcf/core/schema'
import type { PageId } from '@zcf/ui-kit'
import { isLang, navRows, PAGE_ROOTS, PAGES, pageHasIssues } from '@zcf/ui-kit'
import { TOOL_OPTIONS, useConfigEditor } from '@zcf/ui-kit'
import {
  ArchiveRestoreIcon,
  BotIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderCircleIcon,
  MenuIcon,
  NetworkIcon,
  PackageIcon,
  PlayIcon,
  PlugIcon,
  SettingsIcon,
  SparklesIcon,
  WorkflowIcon,
  WrenchIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Lang, Translate } from './api'
import { browserLang, httpService, setRequestLang, tildify } from './api'
import { BrandMark } from './components/brand'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Sheet, SheetContent, SheetTitle } from './components/ui/sheet'
import { Skeleton } from './components/ui/skeleton'
import { AgentsPage } from './pages/agents'
import { ApplyPage } from './pages/apply'
import { BackupPage } from './pages/backup'
import { ExtrasPage } from './pages/extras'
import { McpPage } from './pages/mcp'
import { ProviderPage } from './pages/provider'
import { SettingsPage } from './pages/settings'
import { SkillsPage } from './pages/skills'
import { ToolsPage } from './pages/tools'
import { WorkflowsPage } from './pages/workflows'

type StatusTone = 'info' | 'warning' | 'error'

const PAGE_ICONS: Record<PageId, typeof WrenchIcon> = {
  tools: WrenchIcon,
  provider: PlugIcon,
  mcp: NetworkIcon,
  skills: SparklesIcon,
  settings: SettingsIcon,
  apply: PlayIcon,
  workflows: WorkflowIcon,
  agents: BotIcon,
  extras: PackageIcon,
  backup: ArchiveRestoreIcon,
}

// The nav rows both front ends share: each section's header, then its pages.
const NAV_ROWS = navRows()

function StatusMessage({ status, t }: { status: { text: string; tone: StatusTone } | undefined; t: Translate }) {
  if (!status) return null
  const icon =
    status.tone === 'info' ? (
      <CircleCheckIcon className="size-3.5 text-success" />
    ) : status.tone === 'warning' ? (
      <InfoIcon className="size-3.5 text-warning" />
    ) : (
      <CircleAlertIcon className="size-3.5 text-destructive" />
    )
  return (
    <span
      role="status"
      aria-live="polite"
      // Visible at every width: a failed save must not hide behind a breakpoint.
      className={`flex min-w-0 max-w-48 items-center gap-1.5 text-xs sm:max-w-none ${
        status.tone === 'error'
          ? 'text-destructive'
          : status.tone === 'warning'
            ? 'text-warning'
            : 'text-muted-foreground'
      }`}
    >
      {icon}
      <span className="truncate">{status.text}</span>
      <span className="sr-only">{t('web.save')}</span>
    </span>
  )
}

function NavList({
  page,
  setPage,
  editor,
  t,
  onNavigate,
}: {
  page: PageId
  setPage: (page: PageId) => void
  editor: ReturnType<typeof useConfigEditor>
  t: Translate
  onNavigate?: () => void
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ROWS.map(row => {
        if (row.kind === 'header') {
          return (
            <li
              key={row.id}
              className="text-muted-foreground px-2.5 pt-4 pb-1 text-[11px] font-medium tracking-wide uppercase max-lg:hidden first:pt-1"
            >
              {t(row.labelKey)}
            </li>
          )
        }
        const { id } = row
        const broken = pageHasIssues(editor.validation.issues, PAGE_ROOTS[id])
        const Icon = PAGE_ICONS[id]
        return (
          <li key={id}>
            <button
              type="button"
              aria-current={id === page ? 'page' : undefined}
              onClick={() => {
                setPage(id)
                onNavigate?.()
              }}
              className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                id === page
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
              }`}
            >
              {Icon && <Icon className="size-4 shrink-0" />}
              <span className="flex-1 text-left">{t(`tui.page.${id}`)}</span>
              {broken && <span className="bg-destructive size-1.5 shrink-0 rounded-full" aria-label="!" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function App({
  startupLang,
  langPinned,
  translators,
}: {
  startupLang: Lang
  langPinned: boolean
  translators: Record<Lang, Translate>
}) {
  const editor = useConfigEditor(httpService)
  const [page, setPage] = useState<PageId>('tools')
  const [status, setStatus] = useState<{ text: string; tone: StatusTone }>()
  const [detected, setDetected] = useState<Partial<Record<ToolId, ToolStatus>>>()
  const [navOpen, setNavOpen] = useState(false)
  // Set before the first render ends, so even the config's own first request names the right language.
  const [uiLang, setUiLang] = useState<Lang>(() => {
    const initial = langPinned ? startupLang : browserLang()
    setRequestLang(initial)
    return initial
  })
  const t = translators[uiLang]

  const draftLanguage = editor.status === 'ready' ? editor.draft.language : undefined
  // An invalid value in the file falls back to `auto`, as the schema does.
  const languageSetting = isLanguageSetting(draftLanguage) ? draftLanguage : 'auto'

  // The language field saves at once from the header, so the draft's value drives the UI;
  // `auto` follows the browser, while a pinned flag keeps what the server started with.
  useEffect(() => {
    if (langPinned) return
    const next = isLang(draftLanguage) ? draftLanguage : browserLang()
    if (next !== uiLang) setUiLang(next)
  }, [draftLanguage, langPinned, uiLang])

  // The header's switch saves the field at once, without the rest of the unsaved draft.
  const switchLanguage = (value: string) => {
    editor.saveField(['language'], value).catch((error: unknown) =>
      setStatus({
        text: t('tui.saveFailed', { message: error instanceof Error ? error.message : String(error) }),
        tone: 'error',
      }),
    )
  }

  useEffect(() => {
    document.documentElement.lang = uiLang
    setRequestLang(uiLang)
  }, [uiLang])

  useEffect(() => {
    httpService.detect(TOOL_OPTIONS).then(setDetected, () => setDetected({}))
  }, [])

  // A saved notice fades out; problems stay until the next action replaces them.
  useEffect(() => {
    if (status?.tone !== 'info') return undefined
    const timer = setTimeout(() => setStatus(undefined), 4000)
    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    document.title = editor.dirty ? '• ZCF' : 'ZCF'
  }, [editor.dirty])

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
        text: t('tui.saveFailed', { message: error instanceof Error ? error.message : String(error) }),
        tone: 'error',
      })
    }
  }

  // Ctrl+S or Cmd+S saves, as in the terminal UI.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        void save()
      }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!editor.dirty) return undefined
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault()
    addEventListener('beforeunload', onLeave)
    return () => removeEventListener('beforeunload', onLeave)
  }, [editor.dirty])

  const firstBrokenPage = (): PageId | undefined =>
    PAGES.find(id => pageHasIssues(editor.validation.issues, PAGE_ROOTS[id]))

  if (editor.status === 'loading') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
        <Skeleton className="mb-2 h-6 w-40" />
        <Skeleton className="mb-8 h-4 w-72" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </main>
    )
  }

  if (editor.status === 'broken') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>{t('tui.broken', { path: tildify(editor.path) })}</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc pl-4">
              {editor.loadIssues.map(issue => (
                <li key={`${issue.path}:${issue.message.key}`} className="font-mono text-xs">
                  {issue.path && <code className="mr-1">{issue.path}</code>}
                  {t(issue.message.key, issue.message.params)}
                </li>
              ))}
            </ul>
            <p className="mt-2">{t('web.brokenHint')}</p>
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  const issueCount = editor.validation.issues.length
  const brokenPage = firstBrokenPage()

  return (
    <div className="bg-background min-h-svh">
      <header className="bg-card/90 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label={t('web.menu')}
          >
            <MenuIcon />
          </Button>
          <BrandMark />
          <code className="text-muted-foreground hidden max-w-64 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs md:block">
            {tildify(editor.path)}
          </code>
          {/* The interface-language switch; it saves at once, so it sits by the path, not the form. */}
          <Select value={langPinned ? uiLang : languageSetting} onValueChange={switchLanguage} disabled={langPinned}>
            <SelectTrigger
              className="text-muted-foreground h-7 w-auto px-2 text-xs"
              aria-label={t('field.language')}
              title={t('hint.languageHeader')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang} value={lang}>
                  {t(`language.${lang}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {editor.dirty && (
            <Badge variant="warning" className="hidden md:inline-flex">
              {t('tui.unsaved')}
            </Badge>
          )}
          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
            <StatusMessage status={status} t={t} />
            {issueCount > 0 && brokenPage && (
              <button
                type="button"
                onClick={() => setPage(brokenPage)}
                className="text-destructive hover:bg-destructive/10 rounded-full border border-destructive/40 px-2 py-0.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {t('web.problems', { count: issueCount })}
              </button>
            )}
            <Button onClick={() => void save()} disabled={!editor.dirty || editor.saving} className="gap-1.5">
              {editor.saving && <LoaderCircleIcon className="animate-spin" />}
              {t('web.save')}
              <kbd className="text-muted-foreground hidden rounded border bg-muted px-1 font-mono text-[10px] font-normal sm:inline-block">
                {/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘S' : 'Ctrl S'}
              </kbd>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r p-3 lg:flex">
          <NavList page={page} setPage={setPage} editor={editor} t={t} />
          <div className="mt-auto px-2.5 pb-2">
            <code className="text-muted-foreground block truncate font-mono text-[11px]" title={editor.path}>
              {tildify(editor.path)}
            </code>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-3xl pb-16">
            {page === 'tools' && <ToolsPage editor={editor} t={t} detected={detected} />}
            {page === 'provider' && <ProviderPage editor={editor} t={t} lang={uiLang} />}
            {page === 'mcp' && <McpPage editor={editor} t={t} />}
            {page === 'skills' && <SkillsPage editor={editor} t={t} lang={uiLang} />}
            {page === 'settings' && <SettingsPage editor={editor} t={t} />}
            {page === 'apply' && <ApplyPage editor={editor} t={t} service={httpService} onSave={() => void save()} />}
            {page === 'workflows' && <WorkflowsPage editor={editor} t={t} />}
            {page === 'agents' && <AgentsPage editor={editor} t={t} />}
            {page === 'extras' && <ExtrasPage editor={editor} t={t} />}
            {page === 'backup' && <BackupPage t={t} />}
          </div>
        </main>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent>
          <SheetTitle className="sr-only">{t('web.menu')}</SheetTitle>
          <div className="flex h-14 items-center gap-3 border-b px-4">
            <BrandMark />
            {editor.dirty && <Badge variant="warning">{t('tui.unsaved')}</Badge>}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <NavList page={page} setPage={setPage} editor={editor} t={t} onNavigate={() => setNavOpen(false)} />
          </div>
          <div className="border-t p-4 pb-6">
            <code className="text-muted-foreground block truncate font-mono text-[11px]">{tildify(editor.path)}</code>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
