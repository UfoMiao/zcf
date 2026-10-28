import type { SkillSearchList } from '@zcf/core'
import type { WorkflowPreset } from '@zcf/core/schema'
import { BUILTIN_AGENT_IDS, SKILLS_SEARCH_MIN_QUERY, WORKFLOW_PRESETS } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { addSourcedSkill, getAt, hasSourcedSkill, isTable, removeSourcedSkill, toggleId } from '@zcf/ui-kit'
import { CheckIcon, PlusIcon, SearchIcon, Trash2Icon, WorkflowIcon, XIcon } from 'lucide-react'
import { useState } from 'react'

import type { Translate } from '../api'
import { httpService } from '../api'
import { EmptyState, PageHeader } from '../components/page'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { FieldInput } from '../fields'
import { cn } from '../lib/utils'

type PageProps = { editor: ConfigEditor; t: Translate }

const pickedAgents = (draft: ConfigEditor['draft']): string[] =>
  Array.isArray(draft.agents) ? draft.agents.map(String) : []

/** Whether every skill and agent a preset names is already in the draft. */
function presetOn(draft: ConfigEditor['draft'], preset: WorkflowPreset): boolean {
  const skillsOn = preset.skills.every(source =>
    source.skills.every(name => hasSourcedSkill(draft.skills, source.source, name)),
  )
  return skillsOn && preset.agents.every(id => pickedAgents(draft).includes(id))
}

/** Add ids to a list without repeating one already there. */
function mergeIds(list: unknown, ids: readonly string[]): string[] {
  const current = Array.isArray(list) ? list.map(String) : []
  return [...current, ...ids.filter(id => !current.includes(id))]
}

/** Uncheck a preset: its skills leave their sources, its agents leave the list. */
function presetSkillsAfter(sources: unknown, preset: WorkflowPreset, on: boolean): unknown {
  let next = sources
  for (const source of preset.skills) {
    for (const name of source.skills) {
      next = on ? removeSourcedSkill(next, source.source, name) : addSourcedSkill(next, source.source, name)
    }
  }
  return next
}

/** The v3 workflow presets, as toggles that merge their picks into the draft. */
function PresetsCard({ editor, t }: PageProps) {
  const apply = (preset: WorkflowPreset) => {
    const on = presetOn(editor.draft, preset)
    editor.update(['skills'], presetSkillsAfter(editor.draft.skills, preset, on))
    const agents = on
      ? pickedAgents(editor.draft).filter(id => !preset.agents.some(agent => agent === id))
      : mergeIds(editor.draft.agents, preset.agents)
    editor.update(['agents'], agents.length > 0 ? agents : undefined)
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('web.workflows.presets')}</CardTitle>
        <CardDescription>{t('web.workflows.presetsHint')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {WORKFLOW_PRESETS.map(preset => {
          const on = presetOn(editor.draft, preset)
          const picked = [...preset.skills.flatMap(source => source.skills.map(name => name)), ...preset.agents]
          return (
            <label
              key={preset.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition-colors',
                'outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
                on ? 'border-primary/50 bg-primary/[0.04]' : 'hover:border-input',
              )}
            >
              <Checkbox checked={on} onCheckedChange={() => apply(preset)} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] leading-snug font-medium">{t(preset.nameKey)}</span>
                <span className="text-muted-foreground truncate font-mono text-xs">{picked.join(' · ')}</span>
              </span>
            </label>
          )
        })}
      </CardContent>
    </Card>
  )
}

/** Search the community index and add hits to one bundle's own skills list. */
function BundleSkillSearch({ skills, onAdd, t }: { skills: unknown; onAdd: (list: unknown) => void; t: Translate }) {
  const [query, setQuery] = useState('')
  const [list, setList] = useState<SkillSearchList>()
  const [busy, setBusy] = useState(false)
  const search = () => {
    const text = query.trim()
    if (text.length < SKILLS_SEARCH_MIN_QUERY) return
    setBusy(true)
    httpService
      .searchSkills(text)
      .then(setList, () => setList({ skills: [], source: 'none' }))
      .finally(() => setBusy(false))
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && search()}
          placeholder={t('tui.skills.searchQuery')}
          className="max-w-xs"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={busy || query.trim().length < SKILLS_SEARCH_MIN_QUERY}
          onClick={search}
        >
          <SearchIcon />
          {t('web.skills.search')}
        </Button>
      </div>
      {busy && <p className="text-muted-foreground text-xs">{t('tui.skills.searching')}</p>}
      {!busy && list?.source === 'none' && (
        <p className="text-muted-foreground text-xs">{t('tui.skills.searchFailed')}</p>
      )}
      {!busy && list?.source === 'remote' && list.skills.length === 0 && (
        <p className="text-muted-foreground text-xs">{t('tui.skills.searchNone')}</p>
      )}
      <div className="flex flex-col gap-0.5">
        {list?.skills.map(hit => {
          const added = hasSourcedSkill(skills, hit.source, hit.name)
          return (
            <div key={`${hit.source}/${hit.name}`} className="flex items-center justify-between gap-3 px-1 py-1">
              <span className="truncate font-mono text-[13px]">
                {hit.name}
                <span className="text-muted-foreground">{` · ${hit.source}`}</span>
              </span>
              {added ? (
                <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                  <CheckIcon className="size-3.5" />
                  {t('tui.skills.added')}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onAdd(addSourcedSkill(skills, hit.source, hit.name))}
                >
                  <PlusIcon />
                  {t('web.skills.addSkill')}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** One custom bundle: a name over agent picks, skills and MCP references. */
function BundleCard({ editor, t, index }: PageProps & { index: number }) {
  const root = ['workflows', index] as const
  const bundle = getAt(editor.draft, root)
  const agents = isTable(bundle) && Array.isArray(bundle.agents) ? bundle.agents.map(String) : []
  const skills = isTable(bundle) && Array.isArray(bundle.skills) ? bundle.skills : []
  const mcp = isTable(bundle) && Array.isArray(bundle.mcp) ? bundle.mcp.map(String) : []
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
          <div className="grid gap-2 sm:grid-cols-2">
            {BUILTIN_AGENT_IDS.map(id => (
              <label key={id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card p-2.5">
                <Checkbox
                  checked={agents.includes(id)}
                  onCheckedChange={() => editor.update([...root, 'agents'], toggleId(agents, id))}
                />
                <span className="truncate font-mono text-[13px]">{id}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">{t('tui.page.skills')}</span>
          <BundleSkillSearch skills={skills} t={t} onAdd={list => editor.update([...root, 'skills'], list)} />
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
            <div className="grid gap-2 sm:grid-cols-2">
              {serverNames.map(name => (
                <label key={name} className="flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card p-2.5">
                  <Checkbox
                    checked={mcp.includes(name)}
                    onCheckedChange={() => editor.update([...root, 'mcp'], toggleId(mcp, name))}
                  />
                  <span className="truncate font-mono text-[13px]">{name}</span>
                </label>
              ))}
            </div>
          )}
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
          bundles.map((_, index) => <BundleCard key={index} editor={editor} t={t} index={index} />)
        )}
      </div>
    </section>
  )
}
