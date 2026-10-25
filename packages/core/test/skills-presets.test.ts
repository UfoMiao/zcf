import { readFile } from 'node:fs/promises'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { claudeCode } from '../src/adapters/claude-code'
import type { AdapterContext } from '../src/adapters/types'
import { createContext, builtinSkillsDir } from '../src/context'
import type { CommandStep } from '../src/plan/types'
import type { ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { BUILTIN_SKILLS_SOURCE, builtinSkillsPath, SKILLS_CATALOG, skillDescription } from '../src/schema/skills'
import { fakeRunner, tempDir } from './helpers'

const HOME = '/home/me'
/** The templates folder in this package, which ships with the published CLI. */
const TEMPLATES = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'templates', 'skills')

function context(overrides: Partial<AdapterContext> = {}, files: Record<string, string> = {}): AdapterContext {
  return {
    home: HOME,
    platform: 'linux',
    env: {},
    runner: fakeRunner(),
    readFile: async path => files[path],
    ...overrides,
  }
}

function config(input: Omit<ZcfConfigInput, 'version'>): ZcfConfig {
  const result = parseZcfConfig({ version: 1, ...input })
  if (!result.success) throw new Error(JSON.stringify(result.issues))
  return result.config
}

const installed = { installed: true, command: 'claude', version: '2.1.0' }

describe('createContext', () => {
  it('points the built-in skills at the templates that ship in this package', () => {
    expect(createContext({ env: {} }).builtinSkillsDir).toBe(TEMPLATES)
  })

  it('answers undefined when no templates folder sits next to the code', () => {
    expect(builtinSkillsDir('/nowhere')).toBeUndefined()
  })

  it('maps the environment locale to the interface languages', () => {
    expect(createContext({ env: { LC_ALL: 'zh_CN.UTF-8' } }).locale).toBe('zh-CN')
    expect(createContext({ env: { LANG: 'en_US.UTF-8' } }).locale).toBe('en')
  })

  it('lets ZCF_LANG pin the language over the locale', () => {
    expect(createContext({ env: { ZCF_LANG: 'zh-CN', LC_ALL: 'en_US.UTF-8' } }).locale).toBe('zh-CN')
    // A value ZCF does not speak is not a language at all: the locale decides again.
    expect(createContext({ env: { ZCF_LANG: 'fr', LANG: 'zh_CN.UTF-8' } }).locale).toBe('zh-CN')
  })
})

describe('SKILLS_CATALOG', () => {
  it('lists the skills v3 shipped, in the order its workflows installed them', () => {
    expect(SKILLS_CATALOG.map(skill => skill.id)).toEqual([
      'init-project',
      'workflow',
      'feat',
      'git-commit',
      'git-rollback',
      'git-clean-branches',
      'git-worktree',
      'bmad-init',
    ])
  })

  it('describes every skill in English and Chinese', () => {
    for (const skill of SKILLS_CATALOG) {
      expect(skill.id).toMatch(/^[a-z0-9-]+$/)
      expect(skill.description.en.trim()).not.toBe('')
      expect(skill.description['zh-CN'].trim()).not.toBe('')
    }
  })
})

describe('built-in skill templates', () => {
  it('ships one SKILL.md per catalog entry per language', async () => {
    const texts = await Promise.all(
      SKILLS_CATALOG.flatMap(skill =>
        (['en', 'zh-CN'] as const).map(
          async lang => [lang, skill.id, await readFile(join(TEMPLATES, lang, skill.id, 'SKILL.md'), 'utf8')] as const,
        ),
      ),
    )
    for (const [lang, id, text] of texts) expect(text, `${lang}/${id}`).toContain(`name: ${id}`)
  })
})

describe('builtinSkillsPath', () => {
  const dir = '/zcf/templates/skills'

  it('picks the folder of the configured language', () => {
    expect(builtinSkillsPath(dir, 'zh-CN', 'en')).toBe('/zcf/templates/skills/zh-CN')
    expect(builtinSkillsPath(dir, 'en', 'zh-CN')).toBe('/zcf/templates/skills/en')
  })

  it('follows the locale when the language is auto', () => {
    expect(builtinSkillsPath(dir, 'auto', 'zh-CN')).toBe('/zcf/templates/skills/zh-CN')
    expect(builtinSkillsPath(dir, 'auto', 'zh_TW.UTF-8')).toBe('/zcf/templates/skills/zh-CN')
    expect(builtinSkillsPath(dir, 'auto', 'en_US.UTF-8')).toBe('/zcf/templates/skills/en')
    expect(builtinSkillsPath(dir, 'auto', undefined)).toBe('/zcf/templates/skills/en')
  })
})

describe('skillDescription', () => {
  it('shows the language of the user, falling back to English', () => {
    expect(skillDescription(SKILLS_CATALOG[0]!, 'zh-CN')).toBe(SKILLS_CATALOG[0]!.description['zh-CN'])
    expect(skillDescription(SKILLS_CATALOG[0]!, 'ja-JP')).toBe(SKILLS_CATALOG[0]!.description.en)
  })
})

describe('built-in skills in a plan', () => {
  it('installs them from the language folder the config picks', async () => {
    const plan = await claudeCode.plan(
      config({ skills: [{ source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] }] }),
      installed,
      context({ builtinSkillsDir: TEMPLATES, locale: 'zh-CN' }),
    )
    const steps = plan.steps as CommandStep[]
    expect(steps.map(step => [step.command, ...step.args].join(' '))).toEqual([
      `npx -y skills add ${join(TEMPLATES, 'zh-CN')} -g -y -a claude-code -s git-commit`,
    ])
    // The title names the source as the user wrote it, not the long local path.
    expect(steps[0]!.title.params).toEqual({ source: BUILTIN_SKILLS_SOURCE })
  })

  it('prefers the configured language over the locale', async () => {
    const plan = await claudeCode.plan(
      config({ language: 'en', skills: [{ source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] }] }),
      installed,
      context({ builtinSkillsDir: TEMPLATES, locale: 'zh-CN' }),
    )
    expect((plan.steps as CommandStep[]).map(step => step.args[3])).toEqual([join(TEMPLATES, 'en')])
  })

  it('installs a Windows templates folder with forward slashes on win32', async () => {
    const dir = 'C:/Program Files/zcf/templates/skills'
    const plan = await claudeCode.plan(
      config({ skills: [{ source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] }] }),
      installed,
      context({
        platform: 'win32',
        home: 'C:/Users/me',
        builtinSkillsDir: dir,
        locale: 'zh-CN',
      }),
    )
    const steps = plan.steps as CommandStep[]
    expect(steps.map(step => [step.command, ...step.args].join(' '))).toEqual([
      'npx -y skills add C:/Program Files/zcf/templates/skills/zh-CN -g -y -a claude-code -s git-commit',
    ])
  })

  it('skips a built-in skill that is already installed', async () => {
    const files = { [join(HOME, '.claude', 'skills', 'git-commit', 'SKILL.md')]: 'installed\n' }
    const plan = await claudeCode.plan(
      config({ skills: [{ source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] }] }),
      installed,
      context({ builtinSkillsDir: TEMPLATES }, files),
    )
    expect(plan.steps).toEqual([])
  })

  it('installs every built-in skill when none are named', async () => {
    const dir = await tempDir()
    await mkdir(join(dir, 'en'), { recursive: true })
    await writeFile(join(dir, 'en', 'placeholder'), '')
    const plan = await claudeCode.plan(
      config({ skills: [{ source: BUILTIN_SKILLS_SOURCE }] }),
      installed,
      context({ builtinSkillsDir: dir, locale: 'en' }),
    )
    expect((plan.steps as CommandStep[]).map(step => step.args[3])).toEqual([join(dir, 'en')])
  })

  it('leaves a source that is not the built-in one as the user wrote it', async () => {
    const plan = await claudeCode.plan(
      config({ skills: [{ source: 'owner/repo', skills: ['one'] }] }),
      installed,
      context({ builtinSkillsDir: TEMPLATES, locale: 'zh-CN' }),
    )
    expect((plan.steps as CommandStep[]).map(step => [step.command, ...step.args].join(' '))).toEqual([
      'npx -y skills add owner/repo -g -y -a claude-code -s one',
    ])
  })
})
