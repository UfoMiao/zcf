import { BUILTIN_SKILLS_SOURCE, SKILLS_CATALOG, skillDescription } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { isTable, pickedCatalogSkills, skillSourceIndex, SKILL_FIELDS, toggleCatalogSkill } from '@zcf/ui-kit'
import { PlusIcon, SparklesIcon, Trash2Icon } from 'lucide-react'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { SkillSearchCard } from '../components/skill-search'
import { ToggleCard } from '../components/toggle-card'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { FieldInput } from '../fields'

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
          {SKILLS_CATALOG.map(skill => (
            <ToggleCard
              key={skill.id}
              on={picked.includes(skill.id)}
              onToggle={() => editor.update(['skills'], toggleCatalogSkill(editor.draft.skills, skill.id))}
              title={<span className="truncate font-mono text-[13px] font-medium">{skill.id}</span>}
              detail={
                <span className="text-muted-foreground text-xs leading-relaxed">{skillDescription(skill, lang)}</span>
              }
            />
          ))}
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
        <Card>
          <CardHeader>
            <CardTitle>{t('tui.skills.searchTitle')}</CardTitle>
            <CardDescription>{t('tui.skills.searchHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillSearchCard skills={editor.draft.skills} t={t} onAdd={list => editor.update(['skills'], list)} />
          </CardContent>
        </Card>
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
