import type { SkillSearchList } from '@zcf/core'
import { BUILTIN_SKILLS_SOURCE, SKILLS_CATALOG, SKILLS_SEARCH_MIN_QUERY, skillDescription } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import {
  addSourcedSkill,
  hasSourcedSkill,
  isTable,
  pickedCatalogSkills,
  skillSourceIndex,
  SKILL_FIELDS,
  toggleCatalogSkill,
} from '@zcf/ui-kit'
import { CheckIcon, PlusIcon, SearchIcon, SparklesIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'

import type { Translate } from '../api'
import { httpService } from '../api'
import { PageHeader } from '../components/page'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { FieldInput } from '../fields'
import { cn } from '../lib/utils'

/** The built-in skills ZCF ships, as toggle cards that share one `zcf` source in the draft. */
function CatalogCard({ editor, t, lang }: { editor: ConfigEditor; t: Translate; lang: string }) {
  const picked = pickedCatalogSkills(editor.draft.skills)
  // A `zcf` source that names no skills installs every built-in one; the checkboxes cannot
  // show that, so the card says so and offers the way out.
  const installAll = skillSourceIndex(editor.draft.skills, BUILTIN_SKILLS_SOURCE) !== -1 && picked.length === 0
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tui.skills.builtin')}</CardTitle>
        <CardDescription>{t('tui.skills.catalogTitle')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {installAll && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/[0.04] px-3 py-2">
            <p className="text-muted-foreground text-xs leading-relaxed">{t('tui.skills.builtinAll')}</p>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={() =>
                editor.update(['skills', skillSourceIndex(editor.draft.skills, BUILTIN_SKILLS_SOURCE)], undefined)
              }
            >
              <Trash2Icon />
              {t('tui.skills.delete')}
            </Button>
          </div>
        )}
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {SKILLS_CATALOG.map(skill => {
            const on = picked.includes(skill.id)
            return (
              <label
                key={skill.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 transition-colors',
                  'outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
                  on ? 'border-primary/50 bg-primary/[0.04]' : 'hover:border-input',
                )}
              >
                <Checkbox
                  checked={on}
                  onCheckedChange={() => editor.update(['skills'], toggleCatalogSkill(editor.draft.skills, skill.id))}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-mono text-[13px] font-medium">{skill.id}</span>
                  <span className="text-muted-foreground text-xs leading-relaxed">{skillDescription(skill, lang)}</span>
                </span>
              </label>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/** Search the community skills index and add hits to the draft, right from the page. */
function SearchCard({ editor, t }: { editor: ConfigEditor; t: Translate }) {
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
    <Card>
      <CardHeader>
        <CardTitle>{t('tui.skills.searchTitle')}</CardTitle>
        <CardDescription>{t('tui.skills.searchHint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && search()}
            placeholder={t('tui.skills.searchQuery')}
            className="max-w-xs"
          />
          <Button variant="outline" disabled={busy || query.trim().length < SKILLS_SEARCH_MIN_QUERY} onClick={search}>
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
            const added = hasSourcedSkill(editor.draft.skills, hit.source, hit.name)
            return (
              <div
                key={`${hit.source}/${hit.name}`}
                className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-mono text-[13px]">
                    {hit.name}
                    <span className="text-muted-foreground">{` · ${hit.source}`}</span>
                  </span>
                  {hit.description && (
                    <span className="text-muted-foreground truncate text-xs leading-relaxed">{hit.description}</span>
                  )}
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
                    onClick={() =>
                      editor.update(['skills'], addSourcedSkill(editor.draft.skills, hit.source, hit.name))
                    }
                  >
                    <PlusIcon />
                    {t('web.skills.addSkill')}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function SkillsPage({ editor, t, lang }: { editor: ConfigEditor; t: Translate; lang: string }) {
  const sources = Array.isArray(editor.draft.skills) ? editor.draft.skills : []
  const add = () => editor.update(['skills', sources.length], { source: '' })
  // The built-in `zcf` source is the catalog card above, so it has no card of its own here.
  const external = sources
    .map((source, index) => ({ source, index }))
    .filter(({ source }) => !(isTable(source) && source.source === BUILTIN_SKILLS_SOURCE))
  return (
    <section>
      <PageHeader
        title={t('tui.page.skills')}
        intro={sources.length > 0 ? t('tui.skills.intro') : undefined}
        actions={
          <Button variant="outline" onClick={add}>
            <PlusIcon />
            {t('web.skills.add')}
          </Button>
        }
      />
      <div className="flex flex-col gap-3">
        <CatalogCard editor={editor} t={t} lang={lang} />
        <SearchCard editor={editor} t={t} />
        {sources.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 px-1 text-xs">
            <SparklesIcon className="size-3.5 shrink-0" />
            {t('web.skills.emptyTitle')}
          </p>
        ) : (
          external.map(({ index }) => (
            <Card key={index}>
              {/* Sources have no ids; the index is their identity, as in the config. */}
              <CardHeader className="flex-row items-center justify-between">
                <span className="text-muted-foreground font-mono text-xs">#{index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => editor.update(['skills', index], undefined)}
                >
                  <Trash2Icon />
                  {t('tui.skills.delete')}
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {SKILL_FIELDS.map(field => (
                  <FieldInput key={field.label} editor={editor} root={['skills', index]} field={field} t={t} />
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  )
}
