import process from 'node:process'

import { describe, expect, it } from 'vitest'

import { detectTools, planTools, planUpdates } from '../src/adapters'
import { createContext } from '../src/context'
import type { CommandRunner } from '../src/exec/runner'
import { githubFileUrls } from '../src/mirror'
import { applyPlan } from '../src/plan/apply'
import type { Plan } from '../src/plan/types'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner, tempDir } from './helpers'

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
  it('plans each selected tool once', async () => {
    const plan = await planTools(config, ctx)
    expect(plan.tools.map(tool => tool.tool)).toEqual(['claude-code', 'dsh'])
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
    expect(plan.tools[1]!.notices[0]!.message.key).toBe('notice.notInstalled')
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
    // The installed version, so the caller can tell whether an update found anything newer.
    expect(plan.tools.map(tool => tool.version)).toEqual(['0.164.0', '0.65.0'])
  })
})

function commandEnvs(plan: Plan) {
  return plan.tools.flatMap(tool => tool.steps.map(step => step.kind === 'command' && step.env))
}

function mirrorConfig(mirror: 'official' | 'china') {
  const result = parseZcfConfig({ version: 1, tools: ['claude-code', 'codex'], skills: [{ source: 'a/b' }], mirror })
  return result.success ? result.config : undefined!
}

describe('mirrors', () => {
  const registry = { npm_config_registry: 'https://registry.npmmirror.com' }

  it("points every command at the China mirror's npm registry", async () => {
    const plan = await planTools(mirrorConfig('china'), ctx)
    // Codex is missing here: npm install, then npx skills, for both tools.
    expect(commandEnvs(plan)).toEqual([registry, registry, registry])
    expect(plan.tools[0]!.steps[0]).toMatchObject({ command: 'npx', args: expect.arrayContaining(['skills']) })
  })

  it('uses the official sources by default', async () => {
    expect(commandEnvs(await planTools(mirrorConfig('official'), ctx))).toEqual([undefined, undefined, undefined])
  })

  it('lets ZCF_MIRROR, then the caller, override the config', async () => {
    const envCtx = createContext({ ...ctx, env: { ZCF_MIRROR: 'cn' } })
    expect(commandEnvs(await planTools(mirrorConfig('official'), envCtx))).toEqual([registry, registry, registry])
    const callerCtx = createContext({ ...envCtx, mirror: 'official' })
    expect(commandEnvs(await planTools(mirrorConfig('china'), callerCtx))).toEqual([undefined, undefined, undefined])
  })

  it('keeps an npm registry the user already chose', async () => {
    const own = createContext({ ...ctx, env: { NPM_CONFIG_REGISTRY: 'https://npm.example.com' } })
    expect(commandEnvs(await planTools(mirrorConfig('china'), own))).toEqual([undefined, undefined, undefined])
  })

  it("sends tools' own updaters through the mirror, which they use on npm installs", async () => {
    const plan = await planUpdates(['claude-code'], createContext({ ...ctx, mirror: 'china' }))
    expect(plan.tools[0]!.steps).toEqual([
      expect.objectContaining({ command: 'claude', args: ['update'], env: registry }),
    ])
  })
})

describe('a China-mirror Claude Code install', () => {
  it('installs, checks that claude runs, then configures it', async () => {
    const calls: string[] = []
    let installed = false
    const installer: CommandRunner = {
      async run(command, args) {
        const call = [command, ...args].join(' ')
        calls.push(call)
        if (command === 'npm') installed = true
        const ok = command === 'npm' || (installed && command === 'claude')
        return { exitCode: ok ? 0 : undefined, stdout: '', stderr: '' }
      },
    }
    const china = parseZcfConfig({
      version: 1,
      tools: ['claude-code'],
      mirror: 'china',
      mcpServers: { ctx: { type: 'http', url: 'https://mcp.example.com' } },
    })
    const mirrored = createContext({ ...ctx, runner: installer })
    const plan = await planTools(china.success ? china.config : undefined!, mirrored)
    const [result] = await applyPlan(plan, { runner: installer, backupDir: await tempDir() })
    expect(result!.ok).toBe(true)
    expect(calls.slice(2)).toEqual([
      'npm install -g --allow-scripts=@anthropic-ai/claude-code @anthropic-ai/claude-code',
      'claude --version',
      expect.stringMatching(/^claude mcp add-json ctx /),
    ])
  })
})

describe('githubFileUrls', () => {
  const file = { repo: 'UfoMiao/zcf', ref: 'main', path: 'presets/providers.json' }

  it('tries jsDelivr, then GitHub itself', () => {
    expect(githubFileUrls(file, 'official')).toEqual([
      'https://cdn.jsdelivr.net/gh/UfoMiao/zcf@main/presets/providers.json',
      'https://raw.githubusercontent.com/UfoMiao/zcf/main/presets/providers.json',
    ])
  })

  it('puts the jsDelivr hosts that mainland China reaches first', () => {
    expect(githubFileUrls(file, 'china')).toEqual([
      'https://fastly.jsdelivr.net/gh/UfoMiao/zcf@main/presets/providers.json',
      'https://gcore.jsdelivr.net/gh/UfoMiao/zcf@main/presets/providers.json',
      'https://cdn.jsdelivr.net/gh/UfoMiao/zcf@main/presets/providers.json',
      'https://raw.githubusercontent.com/UfoMiao/zcf/main/presets/providers.json',
    ])
  })
})

describe('detectTools', () => {
  it('reports each selected tool', async () => {
    expect(await detectTools(['claude-code', 'dsh'], ctx)).toEqual({
      'claude-code': { installed: true, command: 'claude', version: '2.1.0' },
      dsh: { installed: false, command: 'dsh' },
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
