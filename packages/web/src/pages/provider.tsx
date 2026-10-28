import type { PresetList } from '@zcf/core'
import { applyPreset, presetSummary } from '@zcf/core/schema'
import type { ConfigEditor, Field } from '@zcf/ui-kit'
import { freshName, getAt, isTable, PROVIDER_FIELDS, sameProvider } from '@zcf/ui-kit'
import { BookmarkPlusIcon, CircleAlertIcon, Trash2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { Translate } from '../api'
import { httpService } from '../api'
import { PageHeader } from '../components/page'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'
import { Input } from '../components/ui/input'
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

/** A profile id the config accepts, taken from the name the user typed. */
function profileId(name: string, taken: readonly string[]): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return freshName(taken, slug || 'profile')
}

/** A draft value shown as text: only a real string is, anything else shows as nothing. */
const asText = (value: unknown): string => (typeof value === 'string' ? value : '')

/** The saved providers beside the active one: switch to one, save the current, delete. */
function ProfilesCard({ editor, t }: PageProps) {
  const profiles = (Array.isArray(editor.draft.profiles) ? editor.draft.profiles : []).filter(isTable)
  const provider = isTable(editor.draft.provider) ? editor.draft.provider : undefined
  const [name, setName] = useState('')
  // The active profile is the one whose provider is the config's provider, key for key —
  // deep and key-order-insensitive, the way two hand-typed tables can still be equal.
  const active = (profile: Record<string, unknown>) =>
    provider !== undefined && sameProvider(profile.provider, provider)

  const saveAs = () => {
    const label = name.trim()
    if (!label || !provider) return
    const taken = profiles.map(profile => asText(profile.id))
    editor.update(['profiles', profiles.length], { id: profileId(label, taken), name: label, provider })
    setName('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('web.profiles.title')}</CardTitle>
        <CardDescription>{t('web.profiles.hint')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y p-0">
        {profiles.length === 0 && (
          <p className="text-muted-foreground px-4 py-3 text-xs leading-relaxed">{t('web.profiles.hint')}</p>
        )}
        {profiles.map((profile, index) => {
          const profileProvider = isTable(profile.provider) ? profile.provider : {}
          const id = asText(profile.id)
          return (
            <div key={id || index} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-[13px] font-medium">
                  <span className="truncate">{asText(profile.name) || id}</span>
                  {active(profile) && <Badge variant="secondary">{t('web.profiles.active')}</Badge>}
                </span>
                <span className="text-muted-foreground truncate font-mono text-xs">
                  {id}
                  {typeof profileProvider.name === 'string' && profileProvider.name ? ` · ${profileProvider.name}` : ''}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={active(profile)}
                  onClick={() => editor.update(['provider'], profile.provider)}
                >
                  {t('web.profiles.switch')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => editor.update(['profiles', index], undefined)}
                  aria-label={t('web.profiles.delete')}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
          )
        })}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <Input
            value={name}
            onChange={event => setName(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && saveAs()}
            placeholder={t('web.profiles.namePlaceholder')}
            className="max-w-xs"
            aria-label={t('web.profiles.saveAs')}
          />
          <Button variant="outline" size="sm" disabled={!name.trim() || !provider} onClick={saveAs}>
            <BookmarkPlusIcon />
            {t('web.profiles.saveAs')}
          </Button>
          {!provider && <p className="text-muted-foreground w-full text-xs">{t('web.profiles.needsProvider')}</p>}
        </div>
      </CardContent>
    </Card>
  )
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
        <ProfilesCard editor={editor} t={t} />
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
