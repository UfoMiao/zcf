import process from 'node:process'

import { describe, expect, it } from 'vitest'

import { detectTools, planTools, planUpdates } from '../src/adapters'
import { createContext } from '../src/context'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner } from './helpers'

const runner = fakeRunner({
  'claude --version': { stdout: '2.1.0' },
})
const ctx = createContext({
  home: '/home/me',
  platform: 'linux',
  env: {},
  runner,
  readFile: async () => undefined,
})
const parsed = parseZcfConfig({
  version: 1,
  tools: ['claude-code', 'dsh', 'claude-code'],
})
const config = parsed.success ? parsed.config : undefined!

describe('planTools', () => {
  it('plans each selected tool once and flags unsupported ones', async () => {
    const plan = await planTools(config, ctx)
    expect(plan.tools.map(tool => tool.tool)).toEqual(['claude-code', 'dsh'])
    expect(plan.tools[1]).toEqual({
      tool: 'dsh',
      steps: [],
      notices: [
        {
          level: 'warning',
          message: {
            key: 'notice.toolNotSupported',
            params: { tool: 'dsh' },
          },
        },
      ],
    })
  })

  it('lets the caller override the tools', async () => {
    const plan = await planTools(config, ctx, ['claude-code'])
    expect(plan.tools.map(tool => tool.tool)).toEqual(['claude-code'])
  })
})

describe('planUpdates', () => {
  it("uses each tool's own updater", async () => {
    const plan = await planUpdates(['claude-code', 'dsh'], ctx)
    expect(plan.tools[0]!.steps).toMatchObject([
      {
        command: 'claude',
        args: ['update'],
      },
    ])
    expect(plan.tools[1]!.notices[0]!.message.key).toBe('notice.toolNotSupported')
  })

  it('reaches the Codex and Gemini CLI adapters', async () => {
    const tools = createContext({
      ...ctx,
      runner: fakeRunner({
        'codex --version': { stdout: 'codex-cli 0.164.0' },
        'gemini --version': { stdout: '0.65.0' },
      }),
    })
    const plan = await planUpdates(['codex', 'gemini-cli'], tools)
    expect(
      plan.tools.map(tool => tool.steps.map(step => step.kind === 'command' && [step.command, ...step.args])),
    ).toEqual([[['codex', 'update']], [['npm', 'install', '-g', '@google/gemini-cli@latest']]])
  })
})

describe('detectTools', () => {
  it('reports supported tools only', async () => {
    expect(await detectTools(['claude-code', 'dsh'], ctx)).toEqual({
      'claude-code': { installed: true, command: 'claude', version: '2.1.0' },
    })
  })
})

describe('createContext', () => {
  it('defaults to the real machine', () => {
    const real = createContext()
    expect(real.home).toBeTruthy()
    expect(real.platform).toBe(process.platform)
  })
})
