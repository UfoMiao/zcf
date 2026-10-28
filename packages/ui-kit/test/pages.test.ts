import { BUILTIN_SKILLS_SOURCE } from '@zcf/core/schema'
import { describe, expect, it } from 'vitest'

import type { PageId } from '../src/pages'
import {
  addSourcedSkill,
  digitIndex,
  hasSourcedSkill,
  NAV,
  navRows,
  PAGES,
  removeSourcedSkill,
  skillSourceIndex,
  toggleCatalogSkill,
  toggleId,
} from '../src/pages'

describe('NAV', () => {
  it('keeps PAGES the flat page list, in nav order', () => {
    expect(NAV.flatMap(section => section.pages)).toEqual(PAGES)
    expect(PAGES).toEqual([
      'tools',
      'provider',
      'mcp',
      'skills',
      'settings',
      'apply',
      'workflows',
      'agents',
      'extras',
      'backup',
    ])
  })

  it('flattens into header and page rows, headed by each section', () => {
    const rows = navRows()
    expect(rows).toHaveLength(NAV.length + PAGES.length)
    // Headers label their section; pages carry the digit that jumps to them.
    expect(rows.map(row => (row.kind === 'header' ? row.labelKey : row.digit))).toEqual([
      'nav.init',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      'nav.workflow',
      '7',
      '8',
      'nav.extras',
      '9',
      'nav.backup',
      '0',
    ])
  })

  it('maps digit keys to the row they name, 0 being the tenth', () => {
    expect(digitIndex('1')).toBe(0)
    expect(digitIndex('9')).toBe(8)
    expect(digitIndex('0')).toBe(9)
  })

  it('keeps a section without pages as a lone header that adds no pages', () => {
    const rows = navRows([
      { id: 'a', labelKey: 'nav.a', pages: [] },
      { id: 'b', labelKey: 'nav.b', pages: ['tools'] },
    ])
    expect(rows).toEqual([
      { kind: 'header', id: 'a', labelKey: 'nav.a' },
      { kind: 'header', id: 'b', labelKey: 'nav.b' },
      { kind: 'page', id: 'tools', digit: '1' },
    ])
  })

  it('numbers pages 1 through 9, then 0 for the tenth; later pages have no digit', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `page-${i}` as PageId)
    const digits = navRows([{ id: 'a', labelKey: 'nav.a', pages: ids }]).map(row =>
      row.kind === 'page' ? row.digit : undefined,
    )
    expect(digits.slice(1, 11).join('')).toBe('1234567890')
    expect(digits.slice(11)).toEqual([undefined, undefined])
  })
})

describe('toggleCatalogSkill', () => {
  it('adds the built-in source with the skill when nothing is picked yet', () => {
    expect(toggleCatalogSkill(undefined, 'git-commit')).toEqual([
      { source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] },
    ])
  })

  it('keeps custom sources when the first built-in skill is picked', () => {
    expect(toggleCatalogSkill([{ source: 'a/a' }], 'git-commit')).toEqual([
      { source: 'a/a' },
      { source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] },
    ])
  })

  it('adds to the skills of the existing built-in source, keeping other sources in place', () => {
    const sources = [
      { source: 'owner/repo', skills: ['one'] },
      { source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] },
    ]
    expect(toggleCatalogSkill(sources, 'git-commit')).toEqual([
      { source: 'owner/repo', skills: ['one'] },
      { source: BUILTIN_SKILLS_SOURCE, skills: ['feat', 'git-commit'] },
    ])
  })

  it('removes a picked skill, and the whole source once its last skill goes', () => {
    const sources = [
      { source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] },
      { source: 'owner/repo', skills: ['one'] },
    ]
    expect(toggleCatalogSkill(sources, 'feat')).toEqual([{ source: 'owner/repo', skills: ['one'] }])
    expect(toggleCatalogSkill(sources, 'git-commit')).not.toBe(sources)
  })

  it('returns undefined when the last picked skill of the only source goes', () => {
    expect(toggleCatalogSkill([{ source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] }], 'feat')).toBeUndefined()
  })

  it('treats a list that is not the draft shape as empty', () => {
    expect(toggleCatalogSkill('nope', 'feat')).toEqual([{ source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] }])
  })
})

describe('hasSourcedSkill', () => {
  it('finds a skill only under the source that installs it', () => {
    const sources = [{ source: 'owner/repo', skills: ['one', 'two'] }, { source: 'zcf' }]
    expect(hasSourcedSkill(sources, 'owner/repo', 'two')).toBe(true)
    expect(hasSourcedSkill(sources, 'owner/repo', 'three')).toBe(false)
    expect(hasSourcedSkill(sources, 'other/repo', 'one')).toBe(false)
    expect(hasSourcedSkill(undefined, 'owner/repo', 'one')).toBe(false)
  })
})

describe('addSourcedSkill', () => {
  it('starts a source for a repository the draft does not draw from yet', () => {
    expect(addSourcedSkill([{ source: 'a/a' }], 'owner/repo', 'one')).toEqual([
      { source: 'a/a' },
      { source: 'owner/repo', skills: ['one'] },
    ])
  })

  it('joins the skills of an existing source instead of adding it twice', () => {
    const sources = [
      { source: 'owner/repo', skills: ['one'] },
      { source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] },
    ]
    expect(addSourcedSkill(sources, 'owner/repo', 'two')).toEqual([
      { source: 'owner/repo', skills: ['one', 'two'] },
      { source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] },
    ])
    // A skill already there leaves the list alone.
    expect(addSourcedSkill(sources, 'owner/repo', 'one')).toEqual(sources)
  })

  it('treats a list that is not the draft shape as empty', () => {
    expect(addSourcedSkill('nope', 'owner/repo', 'one')).toEqual([{ source: 'owner/repo', skills: ['one'] }])
  })
})

describe('skillSourceIndex', () => {
  it('points at the entry, wherever it sits, or says there is none', () => {
    const sources = [{ source: 'a/a' }, { source: 'zcf', skills: ['feat'] }]
    expect(skillSourceIndex(sources, 'zcf')).toBe(1)
    expect(skillSourceIndex(sources, 'nope/nope')).toBe(-1)
    expect(skillSourceIndex(undefined, 'zcf')).toBe(-1)
  })
})

describe('removeSourcedSkill', () => {
  it('drops the skill from its source, keeping the rest of the list', () => {
    const sources = [
      { source: 'owner/repo', skills: ['one', 'two'] },
      { source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] },
    ]
    expect(removeSourcedSkill(sources, 'owner/repo', 'two')).toEqual([
      { source: 'owner/repo', skills: ['one'] },
      { source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] },
    ])
  })

  it('drops the whole source once its last skill goes, keeping the other sources', () => {
    const sources = [
      { source: 'a/a', skills: ['one'] },
      { source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] },
    ]
    expect(removeSourcedSkill(sources, 'a/a', 'one')).toEqual([{ source: BUILTIN_SKILLS_SOURCE, skills: ['feat'] }])
  })

  it('returns undefined when the emptied source was the only one', () => {
    expect(removeSourcedSkill([{ source: 'a/a', skills: ['one'] }], 'a/a', 'one')).toBeUndefined()
  })

  it('leaves a list without the source as it is, undefined when empty', () => {
    expect(removeSourcedSkill([{ source: 'a/a' }], 'zcf', 'feat')).toEqual([{ source: 'a/a' }])
    expect(removeSourcedSkill(undefined, 'zcf', 'feat')).toBeUndefined()
  })
})

describe('toggleId', () => {
  it('adds an id to a list that lacks it, starting one when there is none', () => {
    expect(toggleId(undefined, 'planner')).toEqual(['planner'])
    expect(toggleId(['init-architect'], 'planner')).toEqual(['init-architect', 'planner'])
  })

  it('removes the id, and the whole key once the list empties', () => {
    expect(toggleId(['planner'], 'planner')).toBeUndefined()
    expect(toggleId(['planner', 'ui-ux-designer'], 'planner')).toEqual(['ui-ux-designer'])
  })

  it('treats a list that is not the draft shape as empty', () => {
    expect(toggleId('nope', 'planner')).toEqual(['planner'])
  })
})
