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
  tools: ['claude-code', 'codex', 'claude-code'],
})
const config = parsed.success ? parsed.config : undefined!

describe('planTools', () => {
  it('plans each selected tool once and flags unsupported ones', async () => {
    const plan = await planTools(config, ctx)
    expect(plan.tools.map(tool => tool.tool)).toEqual(['claude-code', 'codex'])
    expect(plan.tools[1]).toEqual({
      tool: 'codex',
      steps: [],
      notices: [
        {
          level: 'warning',
          message: {
            key: 'notice.toolNotSupported',
            params: { tool: 'codex' },
          },
        },
      ],
    })
  })

  it('lets the caller override the tools', async () => {
    const plan = await planTools(config, ctx, ['opencode'])
    expect(plan.tools.map(tool => tool.tool)).toEqual(['opencode'])
  })
})

describe('planUpdates', () => {
  it("uses each tool's own updater", async () => {
    const plan = await planUpdates(['claude-code', 'gemini-cli'], ctx)
    expect(plan.tools[0]!.steps).toMatchObject([
      {
        command: 'claude',
        args: ['update'],
      },
    ])
    expect(plan.tools[1]!.notices[0]!.message.key).toBe('notice.toolNotSupported')
  })
})

describe('detectTools', () => {
  it('reports supported tools only', async () => {
    expect(await detectTools(['claude-code', 'codex'], ctx)).toEqual({
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
