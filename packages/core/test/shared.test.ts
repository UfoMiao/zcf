import { describe, expect, it } from 'vitest'

import { detectCommand, envPath, npmInstallStep, npmUpdateStep, skillSteps } from '../src/adapters/shared'
import { createContext } from '../src/context'
import { protocolModel } from '../src/schema/config'
import { fakeRunner } from './helpers'

const context = (responses = {}, files: Record<string, string> = {}, env = {}) =>
  createContext({
    home: '/home/me',
    platform: 'linux',
    env,
    runner: fakeRunner(responses),
    readFile: async path => files[path],
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
    )
    expect(steps.map(step => step.args)).toEqual([
      ['-y', 'skills', 'add', 'o/missing', '-g', '-y', '-a', 'gemini-cli', '-s', 'a', '-s', 'b'],
    ])
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
