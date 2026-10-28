import { BUILTIN_AGENT_IDS } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { draftIds, toggleId } from '@zcf/ui-kit'
import { BotIcon } from 'lucide-react'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { ToggleCard } from '../components/toggle-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

type PageProps = { editor: ConfigEditor; t: Translate }

export function AgentsPage({ editor, t }: PageProps) {
  const agents = draftIds(editor.draft.agents)
  return (
    <section>
      <PageHeader title={t('tui.page.agents')} intro={t('web.agents.intro')} />
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
            <ToggleCard
              key={id}
              on={agents.includes(id)}
              onToggle={() => editor.update(['agents'], toggleId(agents, id))}
              title={<span className="truncate font-mono text-[13px] font-medium">{id}</span>}
              detail={
                <span className="text-muted-foreground text-xs leading-relaxed">{t(`tui.agents.hint.${id}`)}</span>
              }
            />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
