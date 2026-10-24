import type { ToolId, ToolStatus } from '@zcf/core'
import { TOOL_NAMES } from '@zcf/core/schema'
import type { ApplyOutcome, ConfigEditor, McpType, PlanView, StepEvent, ZcfService } from '@zcf/ui-kit'
import {
  freshName,
  getAt,
  isTable,
  issuesAt,
  mcpFields,
  newMcpServer,
  PROVIDER_FIELDS,
  renameKey,
  SKILL_FIELDS,
  TOOL_OPTIONS,
  withMcpType,
} from '@zcf/ui-kit'
import { useEffect, useRef, useState } from 'react'

import type { Translate } from './api'
import { messageText, tildify } from './api'
import { FieldInput } from './fields'

interface PageProps {
  editor: ConfigEditor
  t: Translate
}

export function ToolsPage({ editor, t, detected }: PageProps & { detected?: Partial<Record<ToolId, ToolStatus>> }) {
  const selected = Array.isArray(editor.draft.tools) ? editor.draft.tools : []
  return (
    <section>
      <p className="intro">{t('tui.tools.intro')}</p>
      <div className="tools">
        {TOOL_OPTIONS.map(tool => {
          const on = selected.includes(tool)
          const status = detected?.[tool]
          return (
            <label key={tool} className={`tool${on ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  editor.update(['tools'], on ? selected.filter(item => item !== tool) : [...selected, tool])
                }
              />
              <span className="tool-name">{TOOL_NAMES[tool]}</span>
              <small className={status?.installed ? 'ok' : undefined}>
                {!detected
                  ? t('tui.tools.checking')
                  : status?.installed
                    ? t('tui.tools.installed', { version: status.version ?? '?' })
                    : t('tui.tools.missing')}
              </small>
            </label>
          )
        })}
      </div>
    </section>
  )
}

export function ProviderPage({ editor, t }: PageProps) {
  return (
    <section>
      <p className="intro">{t('tui.provider.intro')}</p>
      <div className="form">
        {PROVIDER_FIELDS.map(field => (
          <FieldInput key={field.label} editor={editor} root={[]} field={field} t={t} />
        ))}
      </div>
      {editor.draft.provider !== undefined && (
        <div className="actions">
          <button type="button" className="ghost danger" onClick={() => editor.update(['provider'], undefined)}>
            {t('tui.provider.remove')}
          </button>
        </div>
      )}
    </section>
  )
}

function McpServerCard({ editor, t, name }: PageProps & { name: string }) {
  const root = ['mcpServers', name]
  const server = getAt(editor.draft, root)
  const type: McpType = isTable(server) && server.type === 'http' ? 'http' : 'stdio'
  const [draftName, setDraftName] = useState(name)
  const issue = issuesAt(editor.validation.issues, root).find(item => item.path === root.join('.'))
  const rename = () => {
    const next = draftName.trim()
    const taken = Object.keys(isTable(editor.draft.mcpServers) ? editor.draft.mcpServers : {})
    if (next && next !== name && !taken.includes(next))
      editor.replace(renameKey(editor.draft, ['mcpServers'], name, next))
    else setDraftName(name)
  }
  return (
    <div className="card">
      <div className="card-head">
        <input
          className="name"
          aria-label={t('field.mcp.name')}
          value={draftName}
          onChange={event => setDraftName(event.target.value)}
          onBlur={rename}
          onKeyDown={event => event.key === 'Enter' && rename()}
        />
        <button type="button" className="ghost danger" onClick={() => editor.update(root, undefined)}>
          {t('tui.mcp.delete')}
        </button>
      </div>
      {issue && <small className="error">{t(issue.message.key, issue.message.params)}</small>}
      <div className="form">
        {mcpFields(type).map(field => (
          <FieldInput
            key={field.label}
            editor={editor}
            root={root}
            field={field}
            t={t}
            onSelect={
              field.path[0] === 'type'
                ? value => editor.update(root, withMcpType(server, value === 'http' ? 'http' : 'stdio'))
                : undefined
            }
          />
        ))}
      </div>
    </div>
  )
}

export function McpPage({ editor, t }: PageProps) {
  const servers = isTable(editor.draft.mcpServers) ? editor.draft.mcpServers : {}
  const add = (type: McpType) => editor.update(['mcpServers', freshName(Object.keys(servers))], newMcpServer(type))
  return (
    <section>
      <p className="intro">{t('tui.mcp.intro')}</p>
      {Object.keys(servers).map(name => (
        <McpServerCard key={name} editor={editor} t={t} name={name} />
      ))}
      <div className="actions">
        <button type="button" onClick={() => add('stdio')}>
          {t('tui.mcp.addStdio')}
        </button>
        <button type="button" onClick={() => add('http')}>
          {t('tui.mcp.addHttp')}
        </button>
      </div>
    </section>
  )
}

export function SkillsPage({ editor, t }: PageProps) {
  const sources = Array.isArray(editor.draft.skills) ? editor.draft.skills : []
  return (
    <section>
      <p className="intro">{t('tui.skills.intro')}</p>
      {sources.map((_, index) => (
        // Sources have no ids; the index is their identity, as in the config.
        <div className="card" key={index}>
          <div className="form">
            {SKILL_FIELDS.map(field => (
              <FieldInput key={field.label} editor={editor} root={['skills', index]} field={field} t={t} />
            ))}
          </div>
          <div className="actions">
            <button type="button" className="ghost danger" onClick={() => editor.update(['skills', index], undefined)}>
              {t('tui.skills.delete')}
            </button>
          </div>
        </div>
      ))}
      <div className="actions">
        <button type="button" onClick={() => editor.update(['skills', sources.length], { source: '' })}>
          {t('tui.skills.add')}
        </button>
      </div>
    </section>
  )
}

function Patch({ text }: { text: string }) {
  const lines = text.split('\n').filter(line => line && !/^(Index:|====|\+\+\+|---)/.test(line))
  return (
    <pre className="patch">
      {lines.map((line, index) => (
        <span
          key={index}
          className={
            line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : line.startsWith('@@') ? 'hunk' : undefined
          }
        >
          {line}
        </span>
      ))}
    </pre>
  )
}

const STATUS_ICON = { done: '✓', unchanged: '·', skipped: '-', failed: '✗' } as const

export function ApplyPage({ editor, t, service }: PageProps & { service: ZcfService }) {
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

  if (editor.dirty) return <p className="notice">{t('tui.apply.saveFirst')}</p>
  if (error) return <p className="error">{t('tui.apply.failed', { message: error })}</p>
  if (!view) return <p className="intro">{t('tui.apply.planning')}</p>
  if (view.plan.tools.length === 0) return <p className="notice">{t('tui.apply.noTools')}</p>

  const work = view.plan.tools.some((toolPlan, toolIndex) =>
    toolPlan.steps.some((_, index) => view.previews[toolIndex]?.[index]?.changed ?? true),
  )
  const steps = outcome?.results.flatMap(result => result.steps) ?? []
  return (
    <section>
      {view.plan.tools.map((toolPlan, toolIndex) => (
        <div className="card" key={toolPlan.tool}>
          <h3>{TOOL_NAMES[toolPlan.tool]}</h3>
          {toolPlan.notices.map(notice => (
            <p key={notice.message.key} className={notice.level === 'warning' ? 'notice' : 'intro'}>
              {messageText(t, notice.message)}
            </p>
          ))}
          <ol className="steps">
            {toolPlan.steps.map((step, index) => {
              const preview = view.previews[toolIndex]?.[index]
              const result = events.find(event => event.tool === toolPlan.tool && event.index === index)?.result
              return (
                <li key={index} className={result?.status}>
                  <div className="step-title">
                    {result && <span className="status">{STATUS_ICON[result.status]}</span>}
                    {messageText(t, step.title)}
                    {preview && !preview.changed && <em> ({t('cli.unchanged')})</em>}
                    {preview?.changed && preview.before === undefined && <em> ({t('cli.newFile')})</em>}
                  </div>
                  <code className="target">
                    {step.kind === 'command' ? `$ ${[step.command, ...step.args].join(' ')}` : tildify(step.path)}
                  </code>
                  {preview?.changed && <Patch text={preview.patch} />}
                  {result?.detail && <pre className="error">{result.detail}</pre>}
                </li>
              )
            })}
          </ol>
        </div>
      ))}
      {applyError && <p className="error">{t('cli.unexpectedError', { message: applyError })}</p>}
      {outcome && (
        <p className={outcome.results.every(result => result.ok) ? 'success' : 'error'}>
          {outcome.results.every(result => result.ok)
            ? t('cli.applyDone', {
                done: steps.filter(step => step.status === 'done').length,
                unchanged: steps.filter(step => step.status === 'unchanged').length,
              })
            : t('cli.applyFailed', { count: outcome.results.filter(result => !result.ok).length })}
          {steps.some(step => step.backup) && <small> {t('cli.backups', { path: tildify(outcome.backupDir) })}</small>}
        </p>
      )}
      <div className="actions">
        <button type="button" onClick={plan} disabled={busy}>
          {t('web.refresh')}
        </button>
        <button type="button" className="primary" onClick={apply} disabled={busy || !work}>
          {busy ? t('tui.apply.applying') : work ? t('web.apply') : t('cli.nothingToDo')}
        </button>
      </div>
    </section>
  )
}
