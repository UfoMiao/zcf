import process from 'node:process'

import { describe, expect, it } from 'vitest'

import { detectTools, planTools, planUpdates } from '../src/adapters'
import { createContext } from '../src/context'
import type { CommandRunner } from '../src/exec/runner'
import { CHINA_GITHUB_PREFIX, githubFileUrls, OFFICIAL_GITHUB } from '../src/mirror'
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

/** Gemini CLI 0.65.0 installed, with `latest` as npm's newest version. */
function gemini(latest: string) {
  return createContext({
    ...ctx,
    runner: fakeRunner({
      'gemini --version': { stdout: '0.65.0' },
      'npm view @google/gemini-cli version': { stdout: `${latest}\n` },
    }),
  })
}

describe('planUpdates for tools updated with npm', () => {
  it('skips the reinstall when npm has nothing newer', async () => {
    const [plan] = (await planUpdates(['gemini-cli'], gemini('0.65.0'))).tools
    expect(plan!.steps).toEqual([])
    expect(plan!.notices).toEqual([
      { level: 'info', message: { key: 'notice.upToDate', params: { tool: 'gemini-cli', version: '0.65.0' } } },
    ])
  })

  it('reads the scoped package after the allowed scripts in a dsh update', async () => {
    const dsh = createContext({
      ...ctx,
      runner: fakeRunner({
        'dsh --version': { stdout: '0.2.1\n' },
        'npm view @deepseek-ai/dsh version': { stdout: '0.2.1\n' },
      }),
    })
    const [plan] = (await planUpdates(['dsh'], dsh)).tools
    expect(plan!.steps).toEqual([])
    expect(plan!.notices[0]!.message.key).toBe('notice.upToDate')
  })

  it('updates when npm has a newer version, or when it cannot tell', async () => {
    expect((await planUpdates(['gemini-cli'], gemini('0.66.0'))).tools[0]!.steps).toHaveLength(1)
    const offline = createContext({ ...ctx, runner: fakeRunner({ 'gemini --version': { stdout: '0.65.0' } }) })
    expect((await planUpdates(['gemini-cli'], offline)).tools[0]!.steps).toHaveLength(1)
  })

  it('asks the registry the update would use', async () => {
    const calls: Array<Record<string, string> | undefined> = []
    const recorder: CommandRunner = {
      async run(command, _args, options) {
        if (command === 'npm') calls.push(options?.env)
        return { exitCode: 0, stdout: '0.65.0', stderr: '' }
      },
    }
    await planUpdates(['gemini-cli'], createContext({ ...ctx, runner: recorder, mirror: 'china' }))
    expect(calls).toEqual([{ npm_config_registry: 'https://registry.npmmirror.com' }])
  })
})

function commandEnvs(plan: Plan) {
  return plan.tools.flatMap(tool => tool.steps.map(step => step.kind === 'command' && step.env))
}

function mirrorConfig(mirror: 'official' | 'china') {
  const result = parseZcfConfig({ version: 1, tools: ['claude-code', 'codex'], skills: [{ source: 'a/b' }], mirror })
  return result.success ? result.config : undefined!
}

/** The git environment that sends an `npx skills add` clone through the mirror. */
const gitEnv = {
  GIT_CONFIG_COUNT: '1',
  GIT_CONFIG_KEY_0: `url.${CHINA_GITHUB_PREFIX}.insteadOf`,
  GIT_CONFIG_VALUE_0: OFFICIAL_GITHUB,
}

describe('mirrors', () => {
  const registry = { npm_config_registry: 'https://registry.npmmirror.com' }

  it("points every command at the China mirror's npm registry, and every skills clone at its GitHub mirror", async () => {
    const plan = await planTools(mirrorConfig('china'), ctx)
    // Codex is missing here: npm install, then npx skills; Claude Code only runs npx skills.
    expect(commandEnvs(plan)).toEqual([{ ...registry, ...gitEnv }, registry, { ...registry, ...gitEnv }])
    expect(plan.tools[0]!.steps[0]).toMatchObject({ command: 'npx', args: expect.arrayContaining(['skills']) })
  })

  it('uses the official sources by default', async () => {
    expect(commandEnvs(await planTools(mirrorConfig('official'), ctx))).toEqual([undefined, undefined, undefined])
  })

  it('lets ZCF_MIRROR, then the caller, override the config', async () => {
    const envCtx = createContext({ ...ctx, env: { ZCF_MIRROR: 'cn' } })
    expect(commandEnvs(await planTools(mirrorConfig('official'), envCtx))).toEqual([
      { ...registry, ...gitEnv },
      registry,
      { ...registry, ...gitEnv },
    ])
    const callerCtx = createContext({ ...envCtx, mirror: 'official' })
    expect(commandEnvs(await planTools(mirrorConfig('china'), callerCtx))).toEqual([undefined, undefined, undefined])
  })

  it('keeps an npm registry the user already chose; the git mirror is a separate choice', async () => {
    const own = createContext({ ...ctx, env: { NPM_CONFIG_REGISTRY: 'https://npm.example.com' } })
    expect(commandEnvs(await planTools(mirrorConfig('china'), own))).toEqual([gitEnv, undefined, gitEnv])
  })

  it("sends tools' own updaters through the mirror, which they use on npm installs", async () => {
    const plan = await planUpdates(['claude-code'], createContext({ ...ctx, mirror: 'china' }))
    expect(plan.tools[0]!.steps).toEqual([
      expect.objectContaining({ command: 'claude', args: ['update'], env: registry }),
    ])
  })

  it('adds the git rewrite to a skills step without touching the command itself', async () => {
    const plan = await planTools(mirrorConfig('china'), ctx)
    const skillsStep = plan.tools[0]!.steps[0]
    // The skills CLI runs exactly as on the official mirror: the `source` the user wrote is
    // passed through untouched, and only the step's environment gains the mirror's rewrite.
    expect(skillsStep).toMatchObject({ command: 'npx', args: expect.arrayContaining(['skills', 'add', 'a/b']) })
    expect(skillsStep?.kind === 'command' && skillsStep.env).toEqual({ ...registry, ...gitEnv })
  })

  it('keeps the git configuration the user already passes a child process', async () => {
    const own = createContext({ ...ctx, env: { GIT_CONFIG_COUNT: '2' } })
    const plan = await planTools(mirrorConfig('china'), own)
    expect(commandEnvs(plan)).toEqual([registry, registry, registry])
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
