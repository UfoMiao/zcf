import { readFile } from 'node:fs/promises'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { claudeCode } from '../src/adapters/claude-code'
import type { AdapterContext } from '../src/adapters/types'
import { builtinAgentsDir, builtinOutputStylesDir, builtinSkillsDir, createContext } from '../src/context'
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
    expect(builtinAgentsDir('/nowhere')).toBeUndefined()
    expect(builtinOutputStylesDir('/nowhere')).toBeUndefined()
  })

  it('points the agents and output styles at the same shipped templates tree', () => {
    const ctx = createContext({ env: {} })
    expect(ctx.builtinAgentsDir).toBe(join(TEMPLATES, '..', 'agents'))
    expect(ctx.builtinOutputStylesDir).toBe(join(TEMPLATES, '..', 'output-styles'))
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

  it('picks the folder of the config language', () => {
    expect(builtinSkillsPath(dir, 'zh-CN')).toBe('/zcf/templates/skills/zh-CN')
    expect(builtinSkillsPath(dir, 'en')).toBe('/zcf/templates/skills/en')
  })
})

describe('skillDescription', () => {
  it('shows the language of the user, falling back to English', () => {
    expect(skillDescription(SKILLS_CATALOG[0]!, 'zh-CN')).toBe(SKILLS_CATALOG[0]!.description['zh-CN'])
    expect(skillDescription(SKILLS_CATALOG[0]!, 'ja-JP')).toBe(SKILLS_CATALOG[0]!.description.en)
  })
})

/** The command lines of a plan, leaving out key edits such as the language step. */
function commandLines(plan: { steps: unknown[] }): string[] {
  return plan.steps.flatMap(step =>
    typeof step === 'object' && step !== null && 'args' in step && Array.isArray((step as CommandStep).args)
      ? [`${(step as CommandStep).command} ${(step as CommandStep).args.join(' ')}`]
      : [],
  )
}

describe('built-in skills in a plan', () => {
  it('installs them from the config language folder', async () => {
    const plan = await claudeCode.plan(
      config({ configLanguage: 'zh-CN', skills: [{ source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] }] }),
      installed,
      context({ builtinSkillsDir: TEMPLATES }),
    )
    expect(commandLines(plan)).toEqual([
      `npx -y skills add ${join(TEMPLATES, 'zh-CN')} -g -y -a claude-code -s git-commit`,
    ])
    // The title names the source as the user wrote it, not the long local path.
    const add = plan.steps.find(step => typeof step === 'object' && step !== null && 'args' in step) as CommandStep
    expect(add.title.params).toEqual({ source: BUILTIN_SKILLS_SOURCE })
  })

  it('defaults to the English templates', async () => {
    const plan = await claudeCode.plan(
      config({ skills: [{ source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] }] }),
      installed,
      context({ builtinSkillsDir: TEMPLATES }),
    )
    expect((plan.steps as CommandStep[]).map(step => step.args[3])).toEqual([join(TEMPLATES, 'en')])
  })

  it('installs a Windows templates folder with forward slashes on win32', async () => {
    const dir = 'C:/Program Files/zcf/templates/skills'
    const plan = await claudeCode.plan(
      config({ configLanguage: 'zh-CN', skills: [{ source: BUILTIN_SKILLS_SOURCE, skills: ['git-commit'] }] }),
      installed,
      context({
        platform: 'win32',
        home: 'C:/Users/me',
        builtinSkillsDir: dir,
      }),
    )
    expect(commandLines(plan)).toEqual([
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
      context({ builtinSkillsDir: dir }),
    )
    expect((plan.steps as CommandStep[]).map(step => step.args[3])).toEqual([join(dir, 'en')])
  })

  it('leaves a source that is not the built-in one as the user wrote it', async () => {
    const plan = await claudeCode.plan(
      config({ configLanguage: 'zh-CN', skills: [{ source: 'owner/repo', skills: ['one'] }] }),
      installed,
      context({ builtinSkillsDir: TEMPLATES }),
    )
    expect(commandLines(plan)).toEqual(['npx -y skills add owner/repo -g -y -a claude-code -s one'])
  })
})
