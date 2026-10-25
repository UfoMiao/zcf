import { SKILLS_CATALOG, skillDescription } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { pickedCatalogSkills, SKILL_FIELDS, toggleCatalogSkill } from '@zcf/ui-kit'
import { PlusIcon, SparklesIcon, Trash2Icon } from 'lucide-react'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { FieldInput } from '../fields'
import { cn } from '../lib/utils'

/** The built-in skills ZCF ships, as toggle cards that share one `zcf` source in the draft. */
function CatalogCard({ editor, t, lang }: { editor: ConfigEditor; t: Translate; lang: string }) {
  const picked = pickedCatalogSkills(editor.draft.skills)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('tui.skills.catalog')}</CardTitle>
        <CardDescription>{t('tui.skills.catalogTitle')}</CardDescription>
      </CardHeader>
      <CardContent>
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

export function SkillsPage({ editor, t, lang }: { editor: ConfigEditor; t: Translate; lang: string }) {
  const sources = Array.isArray(editor.draft.skills) ? editor.draft.skills : []
  const add = () => editor.update(['skills', sources.length], { source: '' })
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
        {sources.length === 0 ? (
          <p className="text-muted-foreground flex items-center gap-2 px-1 text-xs">
            <SparklesIcon className="size-3.5 shrink-0" />
            {t('web.skills.emptyTitle')}
          </p>
        ) : (
          sources.map((_, index) => (
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
