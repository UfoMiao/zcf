import type { ConfigEditor, McpType } from '@zcf/ui-kit'
import { freshName, getAt, isTable, issuesAt, mcpFields, newMcpServer, renameKey, withMcpType } from '@zcf/ui-kit'
import { GlobeIcon, ServerIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'

import type { Translate } from '../api'
import { EmptyState, PageHeader } from '../components/page'
import { Segmented } from '../components/segmented'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { FieldInput } from '../fields'
import { cn } from '../lib/utils'

function McpServerCard({ editor, t, name }: { editor: ConfigEditor; t: Translate; name: string }) {
  const root = ['mcpServers', name] as const
  const server = getAt(editor.draft, root)
  const rawType = isTable(server) ? server.type : undefined
  const type: McpType = rawType === 'http' ? 'http' : 'stdio'
  // A hand-written type the switch cannot show stays visible next to it, error and all.
  const badType = rawType !== 'stdio' && rawType !== 'http'
  const [draftName, setDraftName] = useState(name)
  const issue = issuesAt(editor.validation.issues, root).find(item => item.path === root.join('.'))
  const typeIssue = issuesAt(editor.validation.issues, [...root, 'type'])[0]
  const rename = () => {
    const next = draftName.trim()
    const taken = Object.keys(isTable(editor.draft.mcpServers) ? editor.draft.mcpServers : {})
    if (next && next !== name && !taken.includes(next))
      editor.replace(renameKey(editor.draft, ['mcpServers'], name, next))
    else setDraftName(name)
  }
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-2 py-3">
        <input
          className={cn(
            'h-7 min-w-32 flex-1 rounded-md bg-transparent px-1.5 font-mono text-[13px] font-medium outline-none',
            'hover:bg-accent/60 focus:bg-accent focus:ring-2 focus:ring-ring/40',
          )}
          aria-label={t('field.mcp.name')}
          value={draftName}
          onChange={event => setDraftName(event.target.value)}
          onBlur={rename}
          onKeyDown={event => event.key === 'Enter' && rename()}
        />
        <div className="flex min-w-0 items-center gap-1.5">
          <Segmented
            aria-label={t('field.mcp.type')}
            options={[
              { value: 'stdio', label: 'stdio' },
              { value: 'http', label: 'http' },
            ]}
            value={type}
            className={typeIssue && 'ring-1 ring-destructive/70'}
            onChange={value => editor.update(root, withMcpType(server, value === 'http' ? 'http' : 'stdio'))}
          />
          {badType && rawType !== undefined && (
            <code className="text-destructive truncate font-mono text-xs" title={JSON.stringify(rawType) ?? ''}>
              {JSON.stringify(rawType)}
            </code>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => editor.update(root, undefined)}
          aria-label={t('tui.mcp.delete')}
        >
          <Trash2Icon />
        </Button>
      </CardHeader>
      {(() => {
        const shown = typeIssue ?? issue
        return (
          shown && (
            <p className="text-destructive px-4 pb-2 text-xs leading-relaxed">
              {t(shown.message.key, shown.message.params)}
            </p>
          )
        )
      })()}
      <CardContent className="grid gap-4 pt-1 pb-4 sm:grid-cols-2">
        {mcpFields(type)
          .filter(field => field.path[0] !== 'type')
          .map(field => (
            <FieldInput key={field.label} editor={editor} root={root} field={field} t={t} />
          ))}
      </CardContent>
    </Card>
  )
}

export function McpPage({ editor, t }: { editor: ConfigEditor; t: Translate }) {
  const servers = isTable(editor.draft.mcpServers) ? editor.draft.mcpServers : {}
  const names = Object.keys(servers)
  const add = (type: McpType) => editor.update(['mcpServers', freshName(names)], newMcpServer(type))
  const addStdio = (
    <Button variant="outline" onClick={() => add('stdio')}>
      <ServerIcon />
      {t('web.mcp.addStdio')}
    </Button>
  )
  const addHttp = (
    <Button variant="outline" onClick={() => add('http')}>
      <GlobeIcon />
      {t('web.mcp.addHttp')}
    </Button>
  )
  return (
    <section>
      <PageHeader
        title={t('tui.page.mcp')}
        intro={names.length > 0 ? t('tui.mcp.intro') : undefined}
        actions={
          <div className="flex gap-2">
            {addStdio}
            {addHttp}
          </div>
        }
      />
      {names.length === 0 ? (
        <EmptyState
          icon={<ServerIcon />}
          title={t('web.mcp.emptyTitle')}
          actions={
            <>
              {addStdio}
              {addHttp}
            </>
          }
        >
          {t('tui.mcp.intro')}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {names.map(name => (
            <McpServerCard key={name} editor={editor} t={t} name={name} />
          ))}
        </div>
      )}
    </section>
  )
}
