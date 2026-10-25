import type { ConfigEditor } from '@zcf/ui-kit'
import { SKILL_FIELDS } from '@zcf/ui-kit'
import { PlusIcon, SparklesIcon, Trash2Icon } from 'lucide-react'

import type { Translate } from '../api'
import { EmptyState, PageHeader } from '../components/page'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { FieldInput } from '../fields'

export function SkillsPage({ editor, t }: { editor: ConfigEditor; t: Translate }) {
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
      {sources.length === 0 ? (
        <EmptyState
          icon={<SparklesIcon />}
          title={t('web.skills.emptyTitle')}
          actions={
            <Button variant="outline" onClick={add}>
              <PlusIcon />
              {t('web.skills.add')}
            </Button>
          }
        >
          {t('tui.skills.intro')}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {sources.map((_, index) => (
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
          ))}
        </div>
      )}
    </section>
  )
}
