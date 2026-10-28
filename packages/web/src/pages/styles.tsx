import { BUILTIN_STYLE_IDS } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { draftIds, isTable, toggleId } from '@zcf/ui-kit'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { ToggleCard } from '../components/toggle-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

type PageProps = { editor: ConfigEditor; t: Translate }

/** An id shown as a toggle card's main line. */
const idTitle = (id: string) => <span className="truncate font-mono text-[13px] font-medium">{id}</span>

/** The output-style page, on its own the way v3's menu had its own entry for it. */
export function StylesPage({ editor, t }: PageProps) {
  const stylesTable = isTable(editor.draft.styles) ? editor.draft.styles : {}
  const styles = draftIds(stylesTable.outputStyles)
  const def = typeof stylesTable.defaultOutputStyle === 'string' ? stylesTable.defaultOutputStyle : ''
  const toggleStyle = (id: string) => {
    editor.update(['styles', 'outputStyles'], toggleId(styles, id))
    // The default cannot point at a style that no longer installs.
    if (def === id) editor.update(['styles', 'defaultOutputStyle'], undefined)
  }
  return (
    <section>
      <PageHeader title={t('tui.page.styles')} intro={t('tui.styles.intro')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('web.styles.title')}</CardTitle>
          <CardDescription>{t('web.styles.hint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {BUILTIN_STYLE_IDS.map(id => (
              <ToggleCard key={id} on={styles.includes(id)} onToggle={() => toggleStyle(id)} title={idTitle(id)} />
            ))}
          </div>
          <div className="flex max-w-xs flex-col gap-1.5">
            <label htmlFor="styles.default" className="text-[13px] font-medium">
              {t('web.styles.default')}
            </label>
            <select
              id="styles.default"
              value={def}
              onChange={event =>
                editor.update(
                  ['styles', 'defaultOutputStyle'],
                  event.target.value === '' ? undefined : event.target.value,
                )
              }
              className="flex h-8 w-full rounded-md border bg-card px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="">{t('web.styles.none')}</option>
              {/* A default written by hand stays visible, so choosing any option changes it. */}
              {def && !BUILTIN_STYLE_IDS.some(id => id === def) && <option value={def}>{def}</option>}
              {BUILTIN_STYLE_IDS.map(id => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
