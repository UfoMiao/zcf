import { BUILTIN_AGENT_IDS, BUILTIN_STYLE_IDS, WORKFLOW_PRESETS } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { draftIds, getAt, isTable, presetCovered, toggleId, togglePreset } from '@zcf/ui-kit'
import { PlusIcon, Trash2Icon, WorkflowIcon, XIcon } from 'lucide-react'

import type { Translate } from '../api'
import { EmptyState, PageHeader } from '../components/page'
import { SkillSearchCard } from '../components/skill-search'
import { ToggleCard } from '../components/toggle-card'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { FieldInput } from '../fields'

type PageProps = { editor: ConfigEditor; t: Translate }

/** An id shown as a toggle card's main line. */
const idTitle = (id: string) => <span className="truncate font-mono text-[13px] font-medium">{id}</span>

/** The v3 workflow presets, as toggles that merge their picks into the draft. */
function PresetsCard({ editor, t }: PageProps) {
  const apply = (preset: (typeof WORKFLOW_PRESETS)[number]) => {
    const next = togglePreset(editor.draft.skills, editor.draft.agents, preset)
    editor.update(['skills'], next.skills)
    editor.update(['agents'], next.agents)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('web.workflows.presets')}</CardTitle>
        <CardDescription>{t('web.workflows.presetsHint')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {WORKFLOW_PRESETS.map(preset => {
          const picked = [...preset.skills.flatMap(source => source.skills.map(name => name)), ...preset.agents]
          return (
            <ToggleCard
              key={preset.id}
              on={presetCovered(editor.draft.skills, editor.draft.agents, preset)}
              onToggle={() => apply(preset)}
              title={<span className="text-[13px] leading-snug font-medium">{t(preset.nameKey)}</span>}
              detail={<span className="text-muted-foreground truncate font-mono text-xs">{picked.join(' · ')}</span>}
            />
          )
        })}
      </CardContent>
    </Card>
  )
}

/** One custom bundle: a name over agent picks, skills and MCP references. */
function BundleCard({ editor, t, index }: PageProps & { index: number }) {
  const root = ['workflows', index] as const
  const bundle = getAt(editor.draft, root)
  const agents = isTable(bundle) && Array.isArray(bundle.agents) ? draftIds(bundle.agents) : []
  const skills = isTable(bundle) && Array.isArray(bundle.skills) ? bundle.skills : []
  const mcp = isTable(bundle) && Array.isArray(bundle.mcp) ? draftIds(bundle.mcp) : []
  const serverNames = Object.keys(isTable(editor.draft.mcpServers) ? editor.draft.mcpServers : {})
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between py-3">
        <span className="text-muted-foreground font-mono text-xs">#{index + 1}</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => editor.update(root, undefined)}
        >
          <Trash2Icon />
          {t('tui.skills.delete')}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <FieldInput
          editor={editor}
          root={root}
          field={{ label: 'web.workflows.name', path: ['name'], kind: 'text', required: true }}
          t={t}
        />
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">{t('web.workflows.agents')}</span>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {BUILTIN_AGENT_IDS.map(id => (
              <ToggleCard
                key={id}
                on={agents.includes(id)}
                onToggle={() => editor.update([...root, 'agents'], toggleId(agents, id))}
                title={<span className="truncate font-mono text-[13px] font-medium">{id}</span>}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">{t('tui.page.skills')}</span>
          <SkillSearchCard skills={skills} t={t} onAdd={list => editor.update([...root, 'skills'], list)} />
          {skills.length > 0 && (
            <div className="flex flex-col gap-1">
              {skills.map((source, at) => {
                const entry = isTable(source) ? source : {}
                const name = typeof entry.source === 'string' ? entry.source : ''
                const picked = Array.isArray(entry.skills) ? entry.skills.map(String).join(', ') : ''
                return (
                  <div key={at} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1">
                    <span className="truncate font-mono text-xs">
                      {name}
                      <span className="text-muted-foreground">{picked ? ` · ${picked}` : ''}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-6"
                      onClick={() => editor.update([...root, 'skills', at], undefined)}
                      aria-label={t('tui.skills.delete')}
                    >
                      <XIcon />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">{t('web.workflows.mcp')}</span>
          {serverNames.length === 0 ? (
            <p className="text-muted-foreground text-xs leading-relaxed">{t('web.workflows.noMcp')}</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {serverNames.map(name => (
                <ToggleCard
                  key={name}
                  on={mcp.includes(name)}
                  onToggle={() => editor.update([...root, 'mcp'], toggleId(mcp, name))}
                  title={<span className="truncate font-mono text-[13px] font-medium">{name}</span>}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/** A bundle's key: its name with its position, since a draft bundle has no id — a fresh
 * one has no name yet and two can share a name, so the position is what keeps keys unique. */
const bundleKey = (bundle: unknown, index: number): string =>
  `${isTable(bundle) && typeof bundle.name === 'string' ? bundle.name : ''}#${index}`

/** The output-style templates: the same shipped content the presets and bundles draw from. */
function StylesCard({ editor, t }: PageProps) {
  const stylesTable = isTable(editor.draft.styles) ? editor.draft.styles : {}
  const styles = draftIds(stylesTable.outputStyles)
  const def = typeof stylesTable.defaultOutputStyle === 'string' ? stylesTable.defaultOutputStyle : ''
  const toggleStyle = (id: string) => {
    editor.update(['styles', 'outputStyles'], toggleId(styles, id))
    // The default cannot point at a style that no longer installs.
    if (def === id) editor.update(['styles', 'defaultOutputStyle'], undefined)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('web.styles.title')}</CardTitle>
        <CardDescription>{t('web.styles.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {BUILTIN_STYLE_IDS.map(id => (
            <ToggleCard key={id} on={styles.includes(id)} onToggle={() => toggleStyle(id)} title={idTitle(id)} />
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
  )
}

export function WorkflowsPage({ editor, t }: PageProps) {
  const bundles = Array.isArray(editor.draft.workflows) ? editor.draft.workflows : []
  const add = () => editor.update(['workflows', bundles.length], { name: '' })
  const addButton = (
    <Button variant="outline" onClick={add}>
      <PlusIcon />
      {t('web.workflows.add')}
    </Button>
  )
  return (
    <section>
      <PageHeader title={t('tui.page.workflows')} intro={t('web.workflows.intro')} actions={addButton} />
      <div className="flex flex-col gap-3">
        <PresetsCard editor={editor} t={t} />
        <span className="text-muted-foreground mt-2 px-1 text-[13px] font-medium">{t('web.workflows.custom')}</span>
        {bundles.length === 0 ? (
          <EmptyState icon={<WorkflowIcon />} title={t('web.workflows.emptyTitle')} actions={addButton}>
            {t('web.workflows.intro')}
          </EmptyState>
        ) : (
          bundles.map((bundle, index) => (
            <BundleCard key={bundleKey(bundle, index)} editor={editor} t={t} index={index} />
          ))
        )}
        <StylesCard editor={editor} t={t} />
      </div>
    </section>
  )
}
