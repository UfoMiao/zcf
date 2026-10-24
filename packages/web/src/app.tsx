import type { ToolId, ToolStatus } from '@zcf/core'
import type { PageId } from '@zcf/ui-kit'
import { issuesAt, PAGE_ROOTS, PAGES, TOOL_OPTIONS, useConfigEditor } from '@zcf/ui-kit'
import { useEffect, useState } from 'react'

import type { Translate } from './api'
import { httpService, tildify } from './api'
import { ApplyPage, McpPage, ProviderPage, SkillsPage, ToolsPage } from './pages'

export function App({ t }: { t: Translate }) {
  const editor = useConfigEditor(httpService)
  const [page, setPage] = useState<PageId>('tools')
  const [status, setStatus] = useState<{ text: string; tone: 'info' | 'warning' | 'error' }>()
  const [detected, setDetected] = useState<Partial<Record<ToolId, ToolStatus>>>()

  useEffect(() => {
    httpService.detect(TOOL_OPTIONS).then(setDetected, () => setDetected({}))
  }, [])

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

  if (editor.status === 'loading') return <p className="loading">{t('tui.loading')}</p>
  if (editor.status === 'broken') {
    return (
      <main className="broken">
        <h2>{t('tui.broken', { path: tildify(editor.path) })}</h2>
        <ul>
          {editor.loadIssues.map(issue => (
            <li key={`${issue.path}:${issue.message.key}`}>
              {issue.path && <code>{issue.path}</code>} {t(issue.message.key, issue.message.params)}
            </li>
          ))}
        </ul>
        <p>{t('web.brokenHint')}</p>
      </main>
    )
  }

  return (
    <div className="layout">
      <header>
        <strong className="brand">ZCF</strong>
        <code className="path">{tildify(editor.path)}</code>
        {editor.dirty && <span className="badge">{t('tui.unsaved')}</span>}
        <span className={`status ${status?.tone ?? ''}`}>{status?.text}</span>
        <button type="button" className="primary" onClick={() => void save()} disabled={!editor.dirty || editor.saving}>
          {t('web.save')}
        </button>
      </header>
      <nav>
        {PAGES.map(id => {
          const root = PAGE_ROOTS[id]
          const broken = root !== undefined && issuesAt(editor.validation.issues, [root]).length > 0
          return (
            <button key={id} type="button" className={id === page ? 'active' : undefined} onClick={() => setPage(id)}>
              {t(`tui.page.${id}`)}
              {broken && <span className="dot" aria-label="!" />}
            </button>
          )
        })}
      </nav>
      <main>
        <h2>{t(`tui.page.${page}`)}</h2>
        {page === 'tools' && <ToolsPage editor={editor} t={t} detected={detected} />}
        {page === 'provider' && <ProviderPage editor={editor} t={t} />}
        {page === 'mcp' && <McpPage editor={editor} t={t} />}
        {page === 'skills' && <SkillsPage editor={editor} t={t} />}
        {page === 'apply' && <ApplyPage editor={editor} t={t} service={httpService} />}
      </main>
    </div>
  )
}
