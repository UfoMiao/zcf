import { BUILTIN_SKILLS_SOURCE } from '@zcf/core/schema'
import { describe, expect, it } from 'vitest'

import { addSourcedSkill, hasSourcedSkill, toggleCatalogSkill } from '../src/pages'

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
