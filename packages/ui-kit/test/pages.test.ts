import type { ConfigIssue } from '@zcf/core/schema'
import { BUILTIN_SKILLS_SOURCE } from '@zcf/core/schema'
import { describe, expect, it } from 'vitest'

import type { PageId } from '../src/pages'
import {
  addSourcedSkill,
  digitIndex,
  draftIds,
  hasSourcedSkill,
  NAV,
  navRows,
  pageHasIssues,
  PAGES,
  presetCovered,
  removeSourcedSkills,
  sameProvider,
  skillSourceIndex,
  toggleCatalogSkill,
  toggleId,
  togglePreset,
} from '../src/pages'

/** One issue at `path`, the shape validation reports. */
const issueAt = (path: string): ConfigIssue[] => [{ path, message: { key: 'configIssue.invalid' } }]

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

describe('pageHasIssues', () => {
  // A page's roots are keys of their own: passing them to issuesAt as one joined path
  // missed every key but a lone first one, so each root is checked on its own.
  it('flags a page when any of its root keys has a problem, at any depth', () => {
    expect(pageHasIssues(issueAt('mirror'), ['mirror', 'configLanguage'])).toBe(true)
    expect(pageHasIssues(issueAt('configLanguage'), ['mirror', 'configLanguage'])).toBe(true)
    expect(pageHasIssues(issueAt('provider.apiKey'), ['provider', 'profiles'])).toBe(true)
    expect(pageHasIssues(issueAt('profiles.0.id'), ['provider', 'profiles'])).toBe(true)
    expect(pageHasIssues(issueAt('provider.apiKey'), ['tools'])).toBe(false)
    expect(pageHasIssues([], ['tools'])).toBe(false)
    expect(pageHasIssues(issueAt('tools.0'), undefined)).toBe(false)
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

describe('draftIds', () => {
  it('reads a draft list as ids, treating anything else as none', () => {
    expect(draftIds(['planner', 'ui-ux-designer'])).toEqual(['planner', 'ui-ux-designer'])
    expect(draftIds(undefined)).toEqual([])
    expect(draftIds('nope')).toEqual([])
  })
})

describe('removeSourcedSkills', () => {
  it('narrows the entry that installs them and drops it once its list is empty', () => {
    const sources = [
      { source: 'zcf', skills: ['feat', 'git-commit'] },
      { source: 'owner/repo', skills: ['one'] },
    ]
    expect(removeSourcedSkills(sources, 'zcf', ['git-commit'])).toEqual([
      { source: 'zcf', skills: ['feat'] },
      { source: 'owner/repo', skills: ['one'] },
    ])
    expect(removeSourcedSkills(sources, 'zcf', ['feat', 'git-commit'])).toEqual([
      { source: 'owner/repo', skills: ['one'] },
    ])
  })

  it('leaves a bare entry alone and returns undefined when nothing is left', () => {
    expect(removeSourcedSkills([{ source: 'zcf' }, { source: 'a/a' }], 'zcf', ['feat'])).toEqual([
      { source: 'zcf' },
      { source: 'a/a' },
    ])
    expect(removeSourcedSkills([{ source: 'zcf', skills: ['feat'] }], 'zcf', ['feat'])).toBeUndefined()
  })
})

describe('presetCovered', () => {
  const preset = {
    skills: [{ source: 'zcf', skills: ['init-project'] }],
    agents: ['init-architect', 'get-current-datetime'] as const,
  }

  it('wants every skill of every source and every agent', () => {
    expect(presetCovered(undefined, undefined, preset)).toBe(false)
    expect(presetCovered([{ source: 'zcf', skills: ['init-project'] }], ['init-architect'], preset)).toBe(false)
    expect(
      presetCovered(
        [{ source: 'zcf', skills: ['init-project', 'feat'] }],
        ['init-architect', 'get-current-datetime'],
        preset,
      ),
    ).toBe(true)
  })

  it('counts a source that names no skills as covering whatever is picked from it', () => {
    expect(presetCovered([{ source: 'zcf' }], ['init-architect', 'get-current-datetime'], preset)).toBe(true)
    expect(presetCovered([{ source: 'owner/repo' }], ['init-architect', 'get-current-datetime'], preset)).toBe(false)
  })
})

describe('sameProvider', () => {
  it('matches provider blocks whatever order their keys were written in', () => {
    const zcfOrder = { name: 'Relay', apiKey: 'k', anthropic: { baseUrl: 'https://r', authType: 'auth_token' } }
    const handOrder = { anthropic: { authType: 'auth_token', baseUrl: 'https://r' }, apiKey: 'k', name: 'Relay' }
    expect(sameProvider(zcfOrder, handOrder)).toBe(true)
    expect(sameProvider(zcfOrder, { ...handOrder, apiKey: 'other' })).toBe(false)
    expect(sameProvider(zcfOrder, { ...zcfOrder, extra: 1 })).toBe(false)
  })

  it('says no when either side is missing or not a block', () => {
    expect(sameProvider(undefined, undefined)).toBe(true)
    expect(sameProvider(undefined, { name: 'Relay' })).toBe(false)
    expect(sameProvider('nope', 'nope')).toBe(true)
  })
})

describe('togglePreset', () => {
  const preset = {
    skills: [{ source: 'zcf', skills: ['init-project'] }],
    agents: ['init-architect'] as const,
  }

  it('merges the preset into the draft when it is not installed yet', () => {
    expect(togglePreset([{ source: 'a/a' }], [], preset)).toEqual({
      skills: [{ source: 'a/a' }, { source: 'zcf', skills: ['init-project'] }],
      agents: ['init-architect'],
    })
  })

  it('keeps the picks that are already there, in the order the draft has them', () => {
    expect(togglePreset([{ source: 'zcf', skills: ['feat'] }], ['planner'], preset)).toEqual({
      skills: [{ source: 'zcf', skills: ['feat', 'init-project'] }],
      agents: ['planner', 'init-architect'],
    })
  })

  it('takes the preset back out, dropping keys once they are empty', () => {
    const installed = {
      skills: [{ source: 'a/a' }, { source: 'zcf', skills: ['init-project'] }],
      agents: ['planner', 'init-architect'],
    }
    expect(togglePreset(installed.skills, installed.agents, preset)).toEqual({
      skills: [{ source: 'a/a' }],
      agents: ['planner'],
    })
    expect(togglePreset([{ source: 'zcf', skills: ['init-project'] }], ['init-architect'], preset)).toEqual({
      skills: undefined,
      agents: undefined,
    })
  })

  it('installs a whole source with a bare entry, which a later toggle-off leaves alone', () => {
    const whole = { skills: [{ source: 'owner/repo', skills: [] }], agents: [] }
    expect(togglePreset([], [], whole)).toEqual({ skills: [{ source: 'owner/repo' }], agents: undefined })
    // "All but these" has no shape, so the bare entry stays and the preset stays covered.
    expect(togglePreset([{ source: 'owner/repo' }], [], whole)).toEqual({
      skills: [{ source: 'owner/repo' }],
      agents: undefined,
    })
  })

  it('keeps an existing bare entry and adds the picked skills of another source', () => {
    const mixed = {
      skills: [
        { source: 'zcf', skills: [] },
        { source: 'owner/repo', skills: ['one'] },
      ],
      agents: [],
    }
    expect(togglePreset([{ source: 'zcf' }], ['planner'], mixed)).toEqual({
      skills: [{ source: 'zcf' }, { source: 'owner/repo', skills: ['one'] }],
      agents: ['planner'],
    })
  })

  it('drops both keys again when a preset with nothing to install is toggled', () => {
    expect(togglePreset([], [], { skills: [], agents: [] })).toEqual({ skills: undefined, agents: undefined })
  })
})
