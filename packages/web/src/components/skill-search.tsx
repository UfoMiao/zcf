import type { SkillSearchList } from '@zcf/core'
import { SKILLS_SEARCH_MIN_QUERY } from '@zcf/core/schema'
import { addSourcedSkill, hasSourcedSkill } from '@zcf/ui-kit'
import { CheckIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'

import type { Translate } from '../api'
import { httpService } from '../api'
import { Button } from './ui/button'
import { Input } from './ui/input'

/**
 * Search the community skills index and add hits to one skills list — the page's own
 * `skills` or a workflow bundle's. `onAdd` receives the whole next list, the way
 * `editor.update` wants it.
 */
export function SkillSearchCard({
  skills,
  onAdd,
  t,
}: {
  /** The skills list the hits join, so already-added ones show as added. */
  skills: unknown
  onAdd: (list: unknown[]) => void
  t: Translate
}) {
  const [query, setQuery] = useState('')
  const [list, setList] = useState<SkillSearchList>()
  const [busy, setBusy] = useState(false)
  const search = () => {
    const text = query.trim()
    if (text.length < SKILLS_SEARCH_MIN_QUERY) return
    setBusy(true)
    httpService
      .searchSkills(text)
      .then(setList, () => setList({ skills: [], source: 'none' }))
      .finally(() => setBusy(false))
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => event.key === 'Enter' && search()}
          placeholder={t('tui.skills.searchQuery')}
          className="max-w-xs"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={busy || query.trim().length < SKILLS_SEARCH_MIN_QUERY}
          onClick={search}
        >
          <SearchIcon />
          {t('web.skills.search')}
        </Button>
      </div>
      {busy && <p className="text-muted-foreground text-xs">{t('tui.skills.searching')}</p>}
      {!busy && list?.source === 'none' && (
        <p className="text-muted-foreground text-xs">{t('tui.skills.searchFailed')}</p>
      )}
      {!busy && list?.source === 'remote' && list.skills.length === 0 && (
        <p className="text-muted-foreground text-xs">{t('tui.skills.searchNone')}</p>
      )}
      <div className="flex flex-col gap-0.5">
        {list?.skills.map(hit => {
          const added = hasSourcedSkill(skills, hit.source, hit.name)
          return (
            <div key={`${hit.source}/${hit.name}`} className="flex items-center justify-between gap-3 px-1 py-1">
              <span className="truncate font-mono text-[13px]">
                {hit.name}
                <span className="text-muted-foreground">{` · ${hit.source}`}</span>
              </span>
              {added ? (
                <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                  <CheckIcon className="size-3.5" />
                  {t('tui.skills.added')}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => onAdd(addSourcedSkill(skills, hit.source, hit.name))}
                >
                  <PlusIcon />
                  {t('web.skills.addSkill')}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
