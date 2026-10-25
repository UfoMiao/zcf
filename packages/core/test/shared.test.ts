import { describe, expect, it } from 'vitest'

import {
  detectCommand,
  envPath,
  npmInstallStep,
  npmUpdateStep,
  skillsAddStep,
  skillSteps,
} from '../src/adapters/shared'
import type { AdapterContext } from '../src/adapters/types'
import { createContext } from '../src/context'
import { CHINA_GITHUB_PREFIX, OFFICIAL_GITHUB } from '../src/mirror'
import { protocolModel } from '../src/schema/config'
import { fakeRunner } from './helpers'

const context = (responses = {}, files: Record<string, string> = {}, env = {}, extra: Partial<AdapterContext> = {}) =>
  createContext({
    home: '/home/me',
    platform: 'linux',
    env,
    runner: fakeRunner(responses),
    readFile: async path => files[path],
    ...extra,
  })

describe('detectCommand', () => {
  it('takes the first command that answers and reads pre-release versions', async () => {
    const ctx = context({ 'agent --version': { stdout: 'agent 2026.10.1-beta.3\n' } })
    expect(await detectCommand(ctx, ['cursor-agent', 'agent'])).toEqual({
      installed: true,
      command: 'agent',
      version: '2026.10.1-beta.3',
    })
  })

  it('falls back to the given command when none is installed', async () => {
    expect(await detectCommand(context(), ['pi'])).toEqual({ installed: false, command: 'pi' })
    expect(await detectCommand(context(), ['a', 'b'], '/opt/a')).toEqual({ installed: false, command: '/opt/a' })
  })
})

describe('npm steps', () => {
  it('install and update with npm', () => {
    expect(npmInstallStep('pi', '@scope/pi')).toMatchObject({ command: 'npm', args: ['install', '-g', '@scope/pi'] })
    expect(npmUpdateStep('pi', '@scope/pi')).toMatchObject({
      title: { key: 'step.update', params: { tool: 'pi' } },
      args: ['install', '-g', '@scope/pi@latest'],
    })
  })
})

describe('skillSteps', () => {
  it('checks the target folder and passes the agent to the skills CLI', async () => {
    const ctx = context({}, { '/home/me/.gemini/skills/a/SKILL.md': '---' })
    const steps = await skillSteps(
      [
        { source: 'o/done', skills: ['a'] },
        { source: 'o/missing', skills: ['a', 'b'] },
      ],
      ctx,
      { agent: 'gemini-cli', dir: '/home/me/.gemini/skills' },
      'en',
    )
    expect(steps.map(step => step.args)).toEqual([
      ['-y', 'skills', 'add', 'o/missing', '-g', '-y', '-a', 'gemini-cli', '-s', 'a', '-s', 'b'],
    ])
  })

  /** The environment the China mirror sends along, so a fresh clone goes through gh-proxy. */
  const gitMirrorEnv = {
    GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: `url.${CHINA_GITHUB_PREFIX}.insteadOf`,
    GIT_CONFIG_VALUE_0: OFFICIAL_GITHUB,
  }

  it('clones a fresh install through the mirror on the China mirror', async () => {
    // Nothing is installed yet: the step runs, with the git configuration that rewrites
    // github.com to the mirror prefix and nothing else. Git answers the probe with its
    // normal "no rule matches" exit 1.
    const noRules = context(
      { 'git config --get-regexp ^url\\.': { exitCode: 1, stdout: '', stderr: '' } },
      {},
      {},
      { mirror: 'china' },
    )
    const steps = await skillSteps(
      [{ source: 'a/b', skills: [] }],
      noRules,
      {
        agent: 'claude-code',
        dir: '/home/me/.claude/skills',
      },
      'en',
    )
    expect(steps.map(step => step.env)).toEqual([gitMirrorEnv])
  })

  it('leaves the clone to the user when their own git configuration rewrites URLs', async () => {
    // The user points github.com at a proxy of their own; git prefers an env-injected rule
    // over a file rule of the same length, so the mirror's rewrite must not shadow theirs.
    const own = context(
      {
        'git config --get-regexp ^url\\.': {
          stdout: 'url.https://m.example/https://github.com.insteadof https://github.com\n',
        },
      },
      {},
      {},
      { mirror: 'china' },
    )
    const steps = await skillSteps([{ source: 'a/b', skills: [] }], own, { agent: 'claude-code', dir: '/d' }, 'en')
    expect(steps.map(step => step.env)).toEqual([undefined])
  })

  it('leaves a clone and an already-installed skill alone', async () => {
    // Official mirror: no environment at all, and the user's git is not even asked.
    const runner = fakeRunner()
    const untouched = createContext({
      home: '/home/me',
      platform: 'linux',
      env: {},
      runner,
      readFile: async () => undefined,
    })
    expect(
      (await skillSteps([{ source: 'a/b', skills: [] }], untouched, { agent: 'claude-code', dir: '/d' }, 'en')).map(
        step => step.env,
      ),
    ).toEqual([undefined])
    expect(runner.calls.map(call => call.join(' '))).not.toContain('git config --get-regexp ^url\\.')
    // Every named skill already installed: no step, so nothing is downloaded anywhere.
    const ctx = context({}, { '/d/keep/SKILL.md': '---' })
    expect(
      await skillSteps([{ source: 'a/b', skills: ['keep'] }], ctx, { agent: 'claude-code', dir: '/d' }, 'en'),
    ).toEqual([])
  })

  it('sends no git configuration the user does not already have', () => {
    expect(skillsAddStep({ source: 'a/b', skills: [] }, 'claude-code', {}, 'a/b').env).toBeUndefined()
    expect(skillsAddStep({ source: 'a/b', skills: [] }, 'claude-code', gitMirrorEnv, 'a/b').env).toEqual(gitMirrorEnv)
  })
})

describe('envPath', () => {
  it('ignores blank values', () => {
    expect(envPath(context({}, {}, { A: ' /x ', B: '  ' }), 'A')).toBe('/x')
    expect(envPath(context({}, {}, { B: '  ' }), 'B')).toBeUndefined()
  })
})

describe('protocolModel', () => {
  it("prefers the protocol's own model over models.default", () => {
    const provider = {
      name: 'x',
      apiKey: 'k',
      openai: { baseUrl: 'https://a.example/v1', model: 'gpt-x' },
      gemini: {},
      models: { default: 'shared' },
    }
    expect(protocolModel(provider, 'openai')).toBe('gpt-x')
    expect(protocolModel(provider, 'gemini')).toBe('shared')
  })
})
