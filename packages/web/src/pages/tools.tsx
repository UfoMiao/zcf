import type { ToolId, ToolStatus } from '@zcf/core'
import { TOOL_NAMES } from '@zcf/core/schema'
import type { ConfigEditor } from '@zcf/ui-kit'
import { TOOL_OPTIONS } from '@zcf/ui-kit'
import { CircleCheckIcon, LoaderCircleIcon } from 'lucide-react'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { Checkbox } from '../components/ui/checkbox'
import { cn } from '../lib/utils'

export function ToolsPage({
  editor,
  t,
  detected,
}: {
  editor: ConfigEditor
  t: Translate
  detected?: Partial<Record<ToolId, ToolStatus>>
}) {
  const selected = Array.isArray(editor.draft.tools) ? editor.draft.tools : []
  return (
    <section>
      <PageHeader title={t('tui.page.tools')} intro={t('web.tools.intro')} />
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {TOOL_OPTIONS.map(tool => {
          const on = selected.includes(tool)
          const status = detected?.[tool]
          const checking = !detected
          const installed = status?.installed
          return (
            <label
              key={tool}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
                'outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
                on ? 'border-primary/50 bg-primary/[0.04]' : 'hover:border-input',
              )}
            >
              <Checkbox
                checked={on}
                onCheckedChange={() =>
                  editor.update(['tools'], on ? selected.filter(item => item !== tool) : [...selected, tool])
                }
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13px] font-medium">{TOOL_NAMES[tool]}</span>
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    installed ? 'text-success' : 'text-muted-foreground',
                  )}
                >
                  {checking ? (
                    <LoaderCircleIcon className="size-3 animate-spin" />
                  ) : installed ? (
                    <CircleCheckIcon className="size-3" />
                  ) : null}
                  {!detected
                    ? t('tui.tools.checking')
                    : installed
                      ? t('tui.tools.installed', { version: status.version ?? '?' })
                      : t('tui.tools.missing')}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}
