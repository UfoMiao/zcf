import type { PresetList } from '@zcf/core'
import { applyPreset, presetSummary } from '@zcf/core/schema'
import type { ConfigEditor, Field } from '@zcf/ui-kit'
import { getAt, isTable, PROVIDER_FIELDS } from '@zcf/ui-kit'
import { CircleAlertIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Translate } from '../api'
import { httpService } from '../api'
import { PageHeader } from '../components/page'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { FieldInput } from '../fields'

type PageProps = { editor: ConfigEditor; t: Translate }

function PresetSelect({ editor, t, lang }: PageProps & { lang: string }) {
  const [list, setList] = useState<PresetList>()
  useEffect(() => {
    httpService.presets().then(setList, () => setList({ presets: [], source: 'none' }))
  }, [])
  const pick = (id: string) => {
    const preset = list?.presets.find(item => item.id === id)
    if (preset) editor.update(['provider'], applyPreset(preset, editor.draft.provider))
  }
  return (
    <Card className="mb-4">
      <CardContent className="flex flex-col gap-2 p-4">
        <span className="text-[13px] leading-none font-medium">{t('tui.provider.preset')}</span>
        <Select value="" onValueChange={pick}>
          <SelectTrigger disabled={!list?.presets.length} aria-label={t('tui.provider.preset')}>
            <SelectValue placeholder={list ? t('tui.provider.presetTitle') : t('tui.provider.presetsLoading')} />
          </SelectTrigger>
          <SelectContent>
            {list?.presets.map(preset => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.name} — {presetSummary(preset, lang)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {list?.source === 'none' && (
          <p className="text-destructive flex items-center gap-1.5 text-xs">
            <CircleAlertIcon className="size-3.5 shrink-0" />
            {t('tui.provider.presetsUnavailable')}
          </p>
        )}
        {list?.source === 'cache' && <p className="text-muted-foreground text-xs">{t('tui.provider.presetsCached')}</p>}
        {list?.source !== 'none' && list?.source !== 'cache' && (
          <p className="text-muted-foreground text-xs">{t('tui.provider.presetHint')}</p>
        )}
      </CardContent>
    </Card>
  )
}

/** One titled group of provider fields. Optional groups collapse while the config leaves them out. */
function FieldSection({
  title,
  present,
  fields,
  editor,
  t,
}: PageProps & { title: string; present: boolean; fields: readonly Field[] }) {
  const [manual, setManual] = useState<boolean>()
  const open = manual ?? present
  return (
    <Collapsible open={open} onOpenChange={setManual}>
      <Card>
        <CardHeader className="flex-row items-center justify-between py-3">
          <CollapsibleTrigger>{title}</CollapsibleTrigger>
          {present && <span className="bg-primary size-1.5 rounded-full" aria-hidden />}
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="grid gap-4 pt-1 pb-4 sm:grid-cols-2">
            {fields.map(field => (
              <FieldInput key={field.label} editor={editor} root={[]} field={field} t={t} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

/** The known sub-blocks of `provider`, with their titles; a block ui-kit adds later still
 * renders after these, under its raw key. */
const GROUP_TITLES: Record<string, string> = {
  anthropic: 'web.provider.anthropic',
  openai: 'web.provider.openai',
  gemini: 'web.provider.gemini',
  models: 'web.provider.models',
}

/** Where a sub-block sorts: known blocks in their fixed order, unknown ones after them. */
const groupRank = (key: string) => {
  const known = Object.keys(GROUP_TITLES)
  const index = known.indexOf(key)
  return index === -1 ? known.length : index
}

/** One group per sub-block the fields actually use, known ones first. */
const providerGroups = () => {
  const keys = [
    ...new Set(
      PROVIDER_FIELDS.flatMap(field =>
        field.path.length > 2 && typeof field.path[1] === 'string' ? [field.path[1]] : [],
      ),
    ),
  ]
  return keys
    .toSorted((a, b) => groupRank(a) - groupRank(b))
    .map(key => ({ key, title: GROUP_TITLES[key], fields: PROVIDER_FIELDS.filter(field => field.path[1] === key) }))
}

export function ProviderPage({ editor, t, lang }: PageProps & { lang: string }) {
  const provider = editor.draft.provider
  const credentials = PROVIDER_FIELDS.filter(field => field.path.length === 2)
  const hasBlock = (key: string) => isTable(getAt(editor.draft, ['provider', key]))
  return (
    <section>
      <PageHeader title={t('tui.page.provider')} intro={t('tui.provider.intro')} />
      <PresetSelect editor={editor} t={t} lang={lang} />
      <div className="flex flex-col gap-3">
        <FieldSection title={t('web.provider.credentials')} present fields={credentials} editor={editor} t={t} />
        {providerGroups().map(group => (
          <FieldSection
            key={group.key}
            title={group.title ? t(group.title) : group.key}
            present={hasBlock(group.key)}
            fields={group.fields}
            editor={editor}
            t={t}
          />
        ))}
      </div>
      {provider !== undefined && (
        <div className="mt-4 flex justify-end border-t pt-4">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => editor.update(['provider'], undefined)}
          >
            <Trash2Icon />
            {t('tui.provider.remove')}
          </Button>
        </div>
      )}
    </section>
  )
}
