import { TOOL_NAMES } from '@zcf/core/schema'
import type { PageId } from '@zcf/ui-kit'
import type { ConfigEditor } from '@zcf/ui-kit'
import { draftIds, isTable, PAGES, TOOL_OPTIONS } from '@zcf/ui-kit'
import { ArrowRightIcon } from 'lucide-react'

import type { Translate } from '../api'
import { PageHeader } from '../components/page'
import { Card, CardContent } from '../components/ui/card'

type PageProps = { editor: ConfigEditor; t: Translate; onNavigate: (page: PageId) => void }

/** A walkthrough step: the page it opens, and where that page's config stands. */
function stepState(editor: ConfigEditor, page: PageId, t: Translate): { label: string; value: string } | undefined {
  const draft = editor.draft
  const todo = t('tui.init.todo')
  switch (page) {
    case 'tools': {
      const picked = draftIds(draft.tools)
      const names = TOOL_OPTIONS.filter(id => picked.includes(id)).map(id => TOOL_NAMES[id])
      return { label: t('tui.page.tools'), value: names.length > 0 ? names.join(', ') : todo }
    }
    case 'provider': {
      const name = isTable(draft.provider) && typeof draft.provider.name === 'string' ? draft.provider.name : ''
      return { label: t('tui.page.provider'), value: name || todo }
    }
    case 'mcp': {
      const servers = Object.keys(isTable(draft.mcpServers) ? draft.mcpServers : {})
      return { label: t('tui.page.mcp'), value: servers.length > 0 ? servers.join(', ') : todo }
    }
    case 'skills': {
      const sources = Array.isArray(draft.skills) ? draft.skills : []
      return {
        label: t('tui.page.skills'),
        value: sources.length > 0 ? t('tui.init.skillSources', { count: sources.length }) : todo,
      }
    }
    case 'workflows': {
      const agents = draftIds(draft.agents)
      const bundles = Array.isArray(draft.workflows) ? draft.workflows : []
      return {
        label: t('tui.page.workflows'),
        value:
          agents.length + bundles.length > 0
            ? t('tui.init.workflowSummary', { agents: agents.length, bundles: bundles.length })
            : todo,
      }
    }
    case 'styles': {
      const styles = isTable(draft.styles) && Array.isArray(draft.styles.outputStyles) ? draft.styles.outputStyles : []
      return {
        label: t('tui.page.styles'),
        value: styles.length > 0 ? t('tui.init.picked', { count: styles.length }) : todo,
      }
    }
    case 'settings': {
      const mirror = typeof draft.mirror === 'string' ? draft.mirror : 'official'
      return { label: t('tui.page.settings'), value: t(`mirror.${mirror}`) }
    }
    case 'apply':
      return { label: t('tui.page.apply'), value: editor.dirty ? t('tui.init.pending') : t('tui.init.clean') }
    default:
      return undefined
  }
}

/**
 * The v3-style first page: every setup step as a row that opens the page doing it, its
 * value saying where that step stands. The walkthrough itself changes nothing.
 */
export function InitPage({ editor, t, onNavigate }: PageProps) {
  const steps = PAGES.filter(page => page !== 'init').flatMap(page => {
    const state = stepState(editor, page, t)
    return state ? [{ page, state }] : []
  })
  return (
    <section>
      <PageHeader title={t('tui.page.init')} intro={t('tui.init.intro')} />
      <Card>
        <CardContent className="flex flex-col divide-y">
          {steps.map(({ page, state }) => (
            <button
              key={page}
              type="button"
              onClick={() => onNavigate(page)}
              className="hover:bg-accent/50 flex items-center justify-between gap-4 px-1 py-2.5 text-left first:pt-1 last:pb-1"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="text-[13px] font-medium">{state.label}</span>
                <span className="text-muted-foreground truncate font-mono text-xs">{state.value}</span>
              </span>
              <ArrowRightIcon className="text-muted-foreground size-4 shrink-0" />
            </button>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
