import { EXTRA_NAMES, MAGPIE_FACES } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { isTable } from '@zcf/ui-kit'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { Segmented } from '../components/segmented'
import { Card, CardContent } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'

type PageProps = { editor: ConfigEditor; t: Translate }

export function ExtrasPage({ editor, t }: PageProps) {
  const extras = isTable(editor.draft.extras) ? editor.draft.extras : {}
  // '' is the unset face: neither client nor cli, so magpie does not install.
  const magpie = MAGPIE_FACES.find(face => face === extras.magpie) ?? ''
  const ccline = extras.ccline === true
  return (
    <section>
      <PageHeader title={t('tui.page.extras')} intro={t('web.extras.intro')} />
      <Card>
        <CardContent className="flex flex-col divide-y p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-mono text-[13px] font-medium">{EXTRA_NAMES.magpie}</span>
              <p className="text-muted-foreground max-w-md text-xs leading-relaxed">{t('web.extras.magpieHint')}</p>
            </div>
            <Segmented
              aria-label={EXTRA_NAMES.magpie}
              value={magpie}
              onChange={value => editor.update(['extras', 'magpie'], value === '' ? undefined : value)}
              options={[
                { value: '', label: t('web.extras.none') },
                ...MAGPIE_FACES.map(face => ({ value: face, label: face })),
              ]}
            />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 p-4">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-medium">{EXTRA_NAMES.ccline}</span>
              <span className="text-muted-foreground max-w-md text-xs leading-relaxed">
                {t('web.extras.cclineHint')}
              </span>
            </span>
            <Checkbox
              checked={ccline}
              onCheckedChange={on => editor.update(['extras', 'ccline'], on ? true : undefined)}
              aria-label={EXTRA_NAMES.ccline}
            />
          </label>
        </CardContent>
      </Card>
    </section>
  )
}
