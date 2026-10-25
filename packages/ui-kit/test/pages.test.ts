import { BUILTIN_SKILLS_SOURCE } from '@zcf/core/schema'
import { describe, expect, it } from 'vitest'

import { toggleCatalogSkill } from '../src/pages'

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
