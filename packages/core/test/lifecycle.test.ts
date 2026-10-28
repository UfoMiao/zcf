import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'

import { dirname } from 'pathe'
import { describe, expect, it } from 'vitest'

import { planUninstalls, planUpdates } from '../src/adapters'
import type { AdapterContext } from '../src/adapters/types'
import { createContext } from '../src/context'
import type { CommandResult, CommandRunner } from '../src/exec/runner'
import { applyPlan } from '../src/plan/apply'
import type { Plan } from '../src/plan/types'
import type { Provider, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner, tempDir } from './helpers'

const HOME = '/home/me'

/** A provider parsed the way the real config is, so defaults such as `authType` are filled. */
function providerOf(input: NonNullable<ZcfConfigInput['provider']>): Provider {
  const result = parseZcfConfig({ version: 1, provider: input })
  if (!result.success) throw new Error(JSON.stringify(result.issues))
  return result.config.provider!
}

/** A context whose commands answer from `responses` and whose files come from `files`. */
function context(overrides: Partial<AdapterContext> = {}, files: Record<string, string> = {}): AdapterContext {
  return createContext({
    home: HOME,
    platform: 'linux',
    env: {},
    runner: fakeRunner(),
    readFile: async path => files[path],
    ...overrides,
  })
}

/** The command lines of a plan, `file` and `remove` steps shown as their path. */
function lines(plan: Plan): string[] {
  return plan.tools.flatMap(tool =>
    tool.steps.map(step =>
      step.kind === 'command' ? [step.command, ...step.args].join(' ') : step.kind === 'copy' ? step.to : step.path,
    ),
  )
}

/** Claude Code 2.1.0 that npm owns, so `claude update` can fall back to npm. */
function npmOwnedClaude(extra: Record<string, Partial<CommandResult>> = {}) {
  return fakeRunner({
    'claude --version': { stdout: '2.1.0' },
    'npm ls -g @anthropic-ai/claude-code --depth=0': {},
    'npm install -g --allow-scripts=@anthropic-ai/claude-code @anthropic-ai/claude-code@latest': {},
    ...extra,
  })
}

/** Answers every `--version` probe: the tool is installed however the paths spell it. */
const versionProbe: CommandRunner = {
  async run(_command, args) {
    return args[0] === '--version'
      ? { exitCode: 0, stdout: '2.1.0', stderr: '' }
      : { exitCode: undefined, stdout: '', stderr: 'not found' }
  },
}

describe('the npm fallback behind a tool updater', () => {
  it('plans npm behind claude update, only when npm owns the package', async () => {
    const owned = await planUpdates(['claude-code'], context({ runner: npmOwnedClaude() }))
    expect(owned.tools[0]!.steps).toEqual([
      {
        kind: 'command',
        title: { key: 'step.update', params: { tool: 'claude-code' } },
        command: 'claude',
        args: ['update'],
      },
      {
        kind: 'command',
        title: { key: 'step.updateNpm', params: { tool: 'claude-code' } },
        command: 'npm',
        args: ['install', '-g', '--allow-scripts=@anthropic-ai/claude-code', '@anthropic-ai/claude-code@latest'],
        fallback: true,
      },
    ])

    // A native install is not npm's to update: npm would leave a second copy behind.
    const native = context({ runner: fakeRunner({ 'claude --version': { stdout: '2.1.0' } }) })
    expect((await planUpdates(['claude-code'], native)).tools[0]!.steps).toHaveLength(1)
  })

  it('gives pi the flags its npm install needs', async () => {
    const runner = fakeRunner({
      'pi --version': { stdout: '0.74.0' },
      'npm ls -g @earendil-works/pi-coding-agent --depth=0': {},
    })
    const plan = await planUpdates(['pi'], context({ runner }))
    expect(plan.tools[0]!.steps[1]).toEqual({
      kind: 'command',
      title: { key: 'step.updateNpm', params: { tool: 'pi' } },
      command: 'npm',
      args: ['install', '-g', '--ignore-scripts', '@earendil-works/pi-coding-agent@latest'],
      fallback: true,
    })
  })

  it('plans the npm fallback behind codex update, with no install flags of its own', async () => {
    const runner = fakeRunner({
      'codex --version': { stdout: 'codex-cli 0.164.0' },
      'npm ls -g @openai/codex --depth=0': {},
    })
    const plan = await planUpdates(['codex'], context({ runner }))
    expect(plan.tools[0]!.steps[1]).toEqual({
      kind: 'command',
      title: { key: 'step.updateNpm', params: { tool: 'codex' } },
      command: 'npm',
      args: ['install', '-g', '@openai/codex@latest'],
      fallback: true,
    })
  })

  it('plans the npm fallback behind opencode upgrade with its allow-scripts flag', async () => {
    const runner = fakeRunner({
      'opencode --version': { stdout: '2.4.5' },
      'npm ls -g opencode-ai --depth=0': {},
    })
    const plan = await planUpdates(['opencode'], context({ runner }))
    expect(plan.tools[0]!.steps[1]).toEqual({
      kind: 'command',
      title: { key: 'step.updateNpm', params: { tool: 'opencode' } },
      command: 'npm',
      args: ['install', '-g', '--allow-scripts=opencode-ai', 'opencode-ai@latest'],
      fallback: true,
    })
  })

  it('runs the fallback when the updater fails, and not when it works', async () => {
    const failing = npmOwnedClaude({ 'claude update': { exitCode: 1, stderr: 'updater broke' } })
    const plan = await planUpdates(['claude-code'], context({ runner: failing }))
    const [result] = await applyPlan(plan, { runner: failing, backupDir: await tempDir() })
    expect(result!.ok).toBe(true)
    expect(result!.steps.map(step => step.status)).toEqual(['failed', 'done'])
    expect(failing.calls).toContainEqual([
      'npm',
      'install',
      '-g',
      '--allow-scripts=@anthropic-ai/claude-code',
      '@anthropic-ai/claude-code@latest',
    ])

    const working = npmOwnedClaude({ 'claude update': {} })
    const ok = await applyPlan(await planUpdates(['claude-code'], context({ runner: working })), {
      runner: working,
      backupDir: await tempDir(),
    })
    expect(ok[0]!.ok).toBe(true)
    expect(ok[0]!.steps.map(step => step.status)).toEqual(['done', 'skipped'])
    expect(working.calls.filter(call => call[0] === 'npm')).toEqual([
      ['npm', 'ls', '-g', '@anthropic-ai/claude-code', '--depth=0'],
    ])
  })

  it('sends the fallback through the mirror registry like any npm command', async () => {
    const plan = await planUpdates(['claude-code'], context({ runner: npmOwnedClaude(), mirror: 'china' }))
    expect(plan.tools[0]!.steps[1]).toMatchObject({
      env: { npm_config_registry: 'https://registry.npmmirror.com' },
    })
  })
})

/** A context on the real filesystem under a fresh temp home, for steps that write or delete. */
async function realContext(runner: CommandRunner, files: Record<string, string>) {
  const home = await tempDir()
  for (const [path, content] of Object.entries(files)) {
    const file = path.replace(HOME, home)
    // Directories are created before their file, so the writes go one after another.
    // oxlint-disable-next-line no-await-in-loop
    await mkdir(dirname(file), { recursive: true })
    // oxlint-disable-next-line no-await-in-loop
    await writeFile(file, content)
  }
  return { home, ctx: createContext({ home, platform: 'linux', env: {}, runner }) }
}

describe('planUninstalls', () => {
  it('uninstalls an npm install with npm, then takes its provider route out of settings.json', async () => {
    const files = {
      [`${HOME}/.claude/settings.json`]:
        '{\n  "env": { "ANTHROPIC_BASE_URL": "https://gw", "ANTHROPIC_MODEL": "glm-4.7" },\n  "model": "sonnet"\n}\n',
    }
    const provider = providerOf({
      name: 'GLM',
      apiKey: 'sk-1',
      anthropic: { baseUrl: 'https://gw' },
      models: { default: 'glm-4.7' },
    })
    const plan = await planUninstalls(['claude-code'], context({ runner: npmOwnedClaude() }, files), provider)
    expect(lines(plan)).toEqual(['npm uninstall -g @anthropic-ai/claude-code', `${HOME}/.claude/settings.json`])
    const settings = plan.tools[0]!.steps[1]!
    // Every key that holds a value the config writes goes; the absent ones need no edit.
    expect(settings.kind === 'file' && settings.edits).toEqual([
      { path: ['env', 'ANTHROPIC_BASE_URL'], value: undefined },
      { path: ['env', 'ANTHROPIC_MODEL'], value: undefined },
    ])
  })

  it('deletes the native files when npm does not own it, with the Windows binary name', async () => {
    const runner = fakeRunner({ 'claude --version': { stdout: '2.1.0' } })
    const linux = await planUninstalls(['claude-code'], context({ runner }))
    expect(lines(linux)).toEqual([`${HOME}/.local/bin/claude`, `${HOME}/.local/share/claude`])

    const windows = await planUninstalls(['claude-code'], context({ platform: 'win32', runner }))
    expect(lines(windows)).toEqual([`${HOME}/.local/bin/claude.exe`, `${HOME}/.local/share/claude`])
  })

  it('removes Codex route keys and a pick that points at them, keeping the model', async () => {
    const files = {
      [`${HOME}/.codex/config.toml`]: [
        'model = "gpt-5"',
        'model_provider = "zcf"',
        '',
        '[model_providers.zcf]',
        'name = "GLM"',
        '',
        '[model_providers.own]',
        'name = "mine"',
      ].join('\n'),
    }
    const runner = fakeRunner({
      'codex --version': { stdout: 'codex-cli 0.164.0' },
      'npm ls -g @openai/codex --depth=0': {},
    })
    const plan = await planUninstalls(['codex'], context({ runner }, files))
    expect(lines(plan)).toEqual(['npm uninstall -g @openai/codex', `${HOME}/.codex/config.toml`])
    const edits = plan.tools[0]!.steps[1]!
    expect(edits.kind === 'file' && edits.edits).toEqual([
      { path: ['model_providers', 'zcf'], value: undefined },
      { path: ['model_provider'], value: undefined },
    ])
  })

  it('deletes the standalone Codex files with the Windows name, and leaves a config naming another provider', async () => {
    const runner = fakeRunner({ 'codex --version': { stdout: 'codex-cli 0.164.0' } })
    const windows = await planUninstalls(['codex'], context({ platform: 'win32', runner }))
    expect(lines(windows)).toEqual([`${HOME}/.local/bin/codex.exe`, `${HOME}/.codex/packages/standalone`])

    // A config.toml that names another provider has nothing of ZCF's to take out.
    const files = {
      [`${HOME}/.codex/config.toml`]: 'model_provider = "own"\n\n[model_providers.own]\nname = "mine"\n',
    }
    const own = await planUninstalls(['codex'], context({ runner }, files))
    expect(lines(own)).toEqual([`${HOME}/.local/bin/codex`, `${HOME}/.codex/packages/standalone`])
  })

  it('uninstalls Gemini CLI through npm and takes its keys out of .env', async () => {
    const files = { [`${HOME}/.gemini/.env`]: 'GEMINI_API_KEY=k\nGOOGLE_GEMINI_BASE_URL=https://gw\n' }
    const runner = fakeRunner({
      'gemini --version': { stdout: '0.65.0' },
      'npm ls -g @google/gemini-cli --depth=0': {},
    })
    const provider = providerOf({ name: 'GLM', apiKey: 'k', gemini: { baseUrl: 'https://gw' } })
    const plan = await planUninstalls(['gemini-cli'], context({ runner }, files), provider)
    expect(lines(plan)).toEqual(['npm uninstall -g @google/gemini-cli', `${HOME}/.gemini/.env`])
    const edits = plan.tools[0]!.steps[1]!
    expect(edits.kind === 'file' && edits.edits).toEqual([
      { path: ['GEMINI_API_KEY'], value: undefined },
      { path: ['GOOGLE_GEMINI_BASE_URL'], value: undefined },
    ])
  })

  it('keeps provider settings whose values are not the ones ZCF wrote', async () => {
    const files = {
      [`${HOME}/.claude/settings.json`]:
        '{ "env": { "ANTHROPIC_BASE_URL": "https://own.example", "ANTHROPIC_AUTH_TOKEN": "sk-own" } }',
    }
    const runner = npmOwnedClaude()
    const provider = providerOf({ name: 'GLM', apiKey: 'sk-1', anthropic: { baseUrl: 'https://gw' } })
    const plan = await planUninstalls(['claude-code'], context({ runner }, files), provider)
    expect(lines(plan)).toEqual(['npm uninstall -g @anthropic-ai/claude-code'])
    expect(plan.tools[0]!.notices).toEqual([
      { level: 'info', message: { key: 'notice.foreignSettings', params: { tool: 'claude-code' } } },
    ])

    // Without a config ZCF cannot attribute anything either, so the same settings stay.
    const bare = await planUninstalls(['claude-code'], context({ runner }, files))
    expect(lines(bare)).toEqual(['npm uninstall -g @anthropic-ai/claude-code'])
    expect(bare.tools[0]!.notices.map(item => item.message.key)).toContain('notice.foreignSettings')
  })

  it('takes only the Gemini .env keys whose values ZCF wrote', async () => {
    const files = {
      [`${HOME}/.gemini/.env`]: 'GEMINI_API_KEY=sk-own\nGOOGLE_GEMINI_BASE_URL=https://gw\nGEMINI_MODEL=glm-4.7\n',
    }
    const runner = fakeRunner({
      'gemini --version': { stdout: '0.65.0' },
      'npm ls -g @google/gemini-cli --depth=0': {},
    })
    const provider = providerOf({ name: 'GLM', apiKey: 'sk-1', gemini: { baseUrl: 'https://gw' } })
    const plan = await planUninstalls(['gemini-cli'], context({ runner }, files), provider)
    expect(lines(plan)).toEqual(['npm uninstall -g @google/gemini-cli', `${HOME}/.gemini/.env`])
    const edits = plan.tools[0]!.steps[1]!
    // The base URL is ZCF's; the user's key stays, and GEMINI_MODEL is never ZCF's writing.
    expect(edits.kind === 'file' && edits.edits).toEqual([{ path: ['GOOGLE_GEMINI_BASE_URL'], value: undefined }])
    expect(plan.tools[0]!.notices).toEqual([
      { level: 'info', message: { key: 'notice.foreignSettings', params: { tool: 'gemini-cli' } } },
    ])
  })

  it("uses OpenCode's own uninstaller off npm, and drops only picks that point at the zcf provider", async () => {
    const files = {
      [`${HOME}/.config/opencode/opencode.json`]: JSON.stringify({
        model: 'zcf/glm-4.7',
        small_model: 'openai/gpt-5-mini',
        provider: { zcf: { name: 'GLM' }, own: { name: 'mine' } },
      }),
    }
    const script = fakeRunner({ 'opencode --version': { stdout: '2.4.5' } })
    const plan = await planUninstalls(['opencode'], context({ runner: script }, files))
    expect(lines(plan)).toEqual([
      'opencode uninstall --keep-config --keep-data',
      `${HOME}/.config/opencode/opencode.json`,
    ])
    const step = plan.tools[0]!.steps[0]!
    expect(step.kind === 'command' && [step.command, ...step.args]).toEqual([
      'opencode',
      'uninstall',
      '--keep-config',
      '--keep-data',
    ])

    const npm = fakeRunner({
      'opencode --version': { stdout: '2.4.5' },
      'npm ls -g opencode-ai --depth=0': {},
    })
    const owned = await planUninstalls(['opencode'], context({ runner: npm }, files))
    expect(lines(owned)).toEqual(['npm uninstall -g opencode-ai', `${HOME}/.config/opencode/opencode.json`])
    const edits = owned.tools[0]!.steps[1]!
    expect(edits.kind === 'file' && edits.edits).toEqual([
      { path: ['provider', 'zcf'], value: undefined },
      { path: ['model'], value: undefined },
    ])
  })

  it('runs the OpenCode uninstaller alone when it left no config behind', async () => {
    const script = fakeRunner({ 'opencode --version': { stdout: '2.4.5' } })
    const plan = await planUninstalls(['opencode'], context({ runner: script }))
    expect(lines(plan)).toEqual(['opencode uninstall --keep-config --keep-data'])
  })

  it('deletes the Cursor CLI files, from LOCALAPPDATA on Windows', async () => {
    const runner = fakeRunner({ 'cursor-agent --version': { stdout: '1.2.0' } })
    const linux = await planUninstalls(['cursor'], context({ runner }))
    expect(lines(linux)).toEqual([`${HOME}/.local/bin/cursor-agent`, `${HOME}/.local/share/cursor-agent`])

    const windows = await planUninstalls(
      ['cursor'],
      context({ platform: 'win32', env: { LOCALAPPDATA: 'C:/Users/me/AppData/Local' }, runner }),
    )
    expect(lines(windows)).toEqual(['C:/Users/me/AppData/Local/cursor-agent'])

    // Without LOCALAPPDATA the default location under the home folder answers instead.
    const bare = await planUninstalls(['cursor'], context({ platform: 'win32', runner }))
    expect(lines(bare)).toEqual([`${HOME}/AppData/Local/cursor-agent`])
  })

  it("takes pi's provider entry and the picks that point at it", async () => {
    const files = {
      [`${HOME}/.pi/agent/models.json`]: JSON.stringify({ providers: { zcf: { name: 'GLM' } } }),
      [`${HOME}/.pi/agent/settings.json`]: JSON.stringify({ defaultProvider: 'zcf', defaultModel: 'glm-4.7' }),
    }
    const runner = fakeRunner({
      'pi --version': { stdout: '0.74.0' },
      'npm ls -g @earendil-works/pi-coding-agent --depth=0': {},
    })
    const plan = await planUninstalls(['pi'], context({ runner }, files))
    expect(lines(plan)).toEqual([
      'npm uninstall -g @earendil-works/pi-coding-agent',
      `${HOME}/.pi/agent/models.json`,
      `${HOME}/.pi/agent/settings.json`,
    ])
    const settings = plan.tools[0]!.steps[2]!
    expect(settings.kind === 'file' && settings.edits).toEqual([
      { path: ['defaultProvider'], value: undefined },
      { path: ['defaultModel'], value: undefined },
    ])
  })

  it('keeps pi settings that name another provider', async () => {
    const files = { [`${HOME}/.pi/agent/settings.json`]: JSON.stringify({ defaultProvider: 'openai' }) }
    const runner = fakeRunner({
      'pi --version': { stdout: '0.74.0' },
      'npm ls -g @earendil-works/pi-coding-agent --depth=0': {},
    })
    const plan = await planUninstalls(['pi'], context({ runner }, files))
    expect(lines(plan)).toEqual(['npm uninstall -g @earendil-works/pi-coding-agent'])
  })

  it("takes dsh's key and route patches out, leaving its MCP entries", async () => {
    const patch = [
      '- id: llm-pi-ai',
      '  config:',
      '    providers:',
      '      zcf:',
      '        displayName: GLM',
      '- id: agent-default-model',
      '  config:',
      '    provider: zcf',
      '    model: glm-4.7',
      '- insert:',
      '    - id: zcf-mcp-ctx',
      '      name: "@deepseek-ai/dsh-mcp-client"',
      '      config:',
      '        serverName: ctx',
      '        transport: stdio',
      '        command: npx',
      '',
    ].join('\n')
    const files = { [`${HOME}/.dsh/cordis.patch.yml`]: patch, [`${HOME}/.dsh/.env`]: 'ZCF_API_KEY=sk-1\n' }
    const runner = fakeRunner({
      'dsh --version': { stdout: '0.2.1' },
      'npm ls -g @deepseek-ai/dsh --depth=0': {},
    })
    const plan = await planUninstalls(['dsh'], context({ runner }, files))
    expect(lines(plan)).toEqual([
      'npm uninstall -g @deepseek-ai/dsh',
      `${HOME}/.dsh/.env`,
      `${HOME}/.dsh/cordis.patch.yml`,
    ])
    const edits = plan.tools[0]!.steps[2]!
    expect(edits.kind === 'file' && edits.edits).toEqual([
      { path: [0, 'config', 'providers', 'zcf'], value: undefined },
      { path: [1, 'config', 'provider'], value: undefined },
      { path: [1, 'config', 'model'], value: undefined },
    ])
  })

  it('leaves a tool that is neither npm-owned nor native, in magpie wording', async () => {
    const runner = fakeRunner({ 'gemini --version': { stdout: '0.65.0' } })
    const plan = await planUninstalls(['gemini-cli'], context({ runner }))
    expect(plan.tools[0]!.steps).toEqual([])
    expect(plan.tools[0]!.notices).toEqual([
      { level: 'warning', message: { key: 'notice.foreignInstall', params: { tool: 'gemini-cli' } } },
    ])
  })

  it('only notes tools that are not installed', async () => {
    const plan = await planUninstalls(['claude-code', 'codex', 'gemini-cli', 'opencode', 'cursor'], context())
    for (const tool of plan.tools) {
      expect(tool).toMatchObject({ steps: [], notices: [{ message: { key: 'notice.notInstalled' } }] })
    }
  })
})

describe('uninstalling on the real filesystem', () => {
  it('deletes a native binary into the backups, and counts a missing one as done already', async () => {
    const { home, ctx } = await realContext(versionProbe, { [`${HOME}/.local/bin/claude`]: '#!/bin/sh\n' })
    const plan = await planUninstalls(['claude-code'], ctx)
    expect(plan.tools[0]!.steps.filter(step => step.kind === 'remove')).toHaveLength(2)

    const backupDir = await tempDir()
    const [result] = await applyPlan(plan, { runner: versionProbe, backupDir, home })
    expect(result!.ok).toBe(true)
    expect(await stat(`${home}/.local/bin/claude`).catch(() => undefined)).toBeUndefined()
    // The binary was copied away first; the versions folder is only cache and goes without a copy.
    expect(await readFile(`${backupDir}/.local/bin/claude`, 'utf8')).toBe('#!/bin/sh\n')
    const statuses = result!.steps.map(step => step.status)
    expect(statuses).toEqual(['done', 'unchanged'])
  })

  it('applies the config cleanup after the uninstall, and skips it when the uninstall fails', async () => {
    const files = { [`${HOME}/.claude/settings.json`]: '{ "env": { "ANTHROPIC_BASE_URL": "https://gw" } }' }
    const provider = providerOf({ name: 'GLM', apiKey: 'sk-1', anthropic: { baseUrl: 'https://gw' } })
    const failing = fakeRunner({
      'claude --version': { stdout: '2.1.0' },
      'npm ls -g @anthropic-ai/claude-code --depth=0': {},
      'npm uninstall -g @anthropic-ai/claude-code': { exitCode: 1, stderr: 'nope' },
    })
    const { home, ctx } = await realContext(failing, files)
    const plan = await planUninstalls(['claude-code'], ctx, provider)
    const [result] = await applyPlan(plan, { runner: failing, backupDir: await tempDir(), home })
    expect(result!.ok).toBe(false)
    expect(result!.steps.map(step => step.status)).toEqual(['failed', 'skipped'])
    expect(await readFile(`${home}/.claude/settings.json`, 'utf8')).toContain('ANTHROPIC_BASE_URL')

    const working = fakeRunner({
      'claude --version': { stdout: '2.1.0' },
      'npm ls -g @anthropic-ai/claude-code --depth=0': {},
      'npm uninstall -g @anthropic-ai/claude-code': {},
    })
    const again = await realContext(working, files)
    const replan = await planUninstalls(['claude-code'], again.ctx, provider)
    const [ok] = await applyPlan(replan, { runner: working, backupDir: await tempDir(), home: again.home })
    expect(ok!.ok).toBe(true)
    expect(await readFile(`${again.home}/.claude/settings.json`, 'utf8')).not.toContain('ANTHROPIC')
  })
})
