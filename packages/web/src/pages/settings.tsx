import type { ConfigEditor } from '@zcf/ui-kit'
import { SETTINGS_FIELDS } from '@zcf/ui-kit'
import { InfoIcon } from 'lucide-react'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { Alert } from '../components/ui/alert'
import { Card, CardContent } from '../components/ui/card'
import { FieldInput } from '../fields'

export function SettingsPage({ editor, t }: { editor: ConfigEditor; t: Translate }) {
  return (
    <section>
      <PageHeader title={t('tui.page.settings')} intro={t('tui.settings.intro')} />
      {editor.envMirror && (
        <Alert variant="info" className="mb-4">
          <InfoIcon />
          <div className="text-[13px] leading-relaxed">
            {t('tui.settings.envMirror', { mirror: t(`mirror.${editor.envMirror}`) })}
          </div>
        </Alert>
      )}
      <Card>
        <CardContent className="grid gap-6 p-4 sm:grid-cols-2">
          {SETTINGS_FIELDS.map(field => (
            <FieldInput key={field.label} editor={editor} root={[]} field={field} t={t} />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
