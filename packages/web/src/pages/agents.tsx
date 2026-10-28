import { BUILTIN_AGENT_IDS, BUILTIN_STYLE_IDS } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { isTable, toggleId } from '@zcf/ui-kit'
import { BotIcon } from 'lucide-react'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { cn } from '../lib/utils'

type PageProps = { editor: ConfigEditor; t: Translate }

/** The draft's `agents` list, or nothing when the key is absent. */
const draftAgents = (draft: ConfigEditor['draft']): unknown[] => {
  const list = draft.agents
  return Array.isArray(list) ? list : []
}

/** The draft's `styles.outputStyles` list, or nothing when the key is absent. */
const draftStyles = (draft: ConfigEditor['draft']): unknown[] => {
  const styles = draft.styles
  const list = isTable(styles) ? styles.outputStyles : undefined
  return Array.isArray(list) ? list : []
}

/** One toggle card of an id, the way the skills catalog shows its picks. */
function IdToggle({ id, on, onToggle }: { id: string; on: boolean; onToggle: () => void }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
        'outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
        on ? 'border-primary/50 bg-primary/[0.04]' : 'hover:border-input',
      )}
    >
      <Checkbox checked={on} onCheckedChange={onToggle} />
      <span className="truncate font-mono text-[13px] font-medium">{id}</span>
    </label>
  )
}

export function AgentsPage({ editor, t }: PageProps) {
  const agents = draftAgents(editor.draft).map(String)
  const styles = draftStyles(editor.draft).map(String)
  const stylesTable = isTable(editor.draft.styles) ? editor.draft.styles : {}
  const def = typeof stylesTable.defaultOutputStyle === 'string' ? stylesTable.defaultOutputStyle : ''

  const toggleStyle = (id: string) => {
    editor.update(['styles', 'outputStyles'], toggleId(styles, id))
    // The default cannot point at a style that no longer installs.
    if (def === id) editor.update(['styles', 'defaultOutputStyle'], undefined)
  }

  return (
    <section>
      <PageHeader title={t('tui.page.agents')} intro={t('web.agents.intro')} />
      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BotIcon className="text-muted-foreground size-4" />
              {t('web.agents.builtin')}
            </CardTitle>
            <CardDescription>{t('web.agents.builtinHint')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {BUILTIN_AGENT_IDS.map(id => (
              <IdToggle
                key={id}
                id={id}
                on={agents.includes(id)}
                onToggle={() => editor.update(['agents'], toggleId(agents, id))}
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('web.styles.title')}</CardTitle>
            <CardDescription>{t('web.styles.hint')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {BUILTIN_STYLE_IDS.map(id => (
                <IdToggle key={id} id={id} on={styles.includes(id)} onToggle={() => toggleStyle(id)} />
              ))}
            </div>
            <div className="flex max-w-xs flex-col gap-1.5">
              <label htmlFor="styles.default" className="text-[13px] font-medium">
                {t('web.styles.default')}
              </label>
              <select
                id="styles.default"
                value={def}
                onChange={event =>
                  editor.update(
                    ['styles', 'defaultOutputStyle'],
                    event.target.value === '' ? undefined : event.target.value,
                  )
                }
                className="flex h-8 w-full rounded-md border bg-card px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <option value="">{t('web.styles.none')}</option>
                {/* A default written by hand stays visible, so choosing any option changes it. */}
                {def && !BUILTIN_STYLE_IDS.some(id => id === def) && <option value={def}>{def}</option>}
                {BUILTIN_STYLE_IDS.map(id => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
