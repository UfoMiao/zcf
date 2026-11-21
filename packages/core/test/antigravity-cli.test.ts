import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { planTools } from '../src/adapters'
import { antigravityCli } from '../src/adapters/antigravity-cli'
import type { AdapterContext } from '../src/adapters/types'
import { applyPlan } from '../src/plan/apply'
import type { CommandStep, FileStep } from '../src/plan/types'
import type { ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner, tempDir } from './helpers'

const HOME = '/home/me'
const MCP_FILE = join(HOME, '.gemini', 'config', 'mcp_config.json')

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

const installed = { installed: true, command: 'agy', version: '1.0.3' }

const SERVERS: ZcfConfigInput['mcpServers'] = {
  local: { type: 'stdio', command: 'npx', args: ['-y', 'pkg'], env: { TOKEN: 't' } },
  docs: { type: 'http', url: 'https://docs.example.com/mcp', headers: { Authorization: 'Bearer t' } },
  bare: { type: 'stdio', command: 'server' },
}

describe('config schema', () => {
  it('accepts antigravity-cli and rejects the removed gemini-cli', () => {
    expect(parseZcfConfig({ version: 1, tools: ['antigravity-cli'] }).success).toBe(true)
    const result = parseZcfConfig({ version: 1, tools: ['gemini-cli'] })
    expect(result.success).toBe(false)
    expect(!result.success && result.issues[0]).toMatchObject({
      path: 'tools.0',
      message: { params: { expected: expect.stringContaining('"antigravity-cli"') } },
    })
  })
})

describe('antigravityCli.detect', () => {
  it('finds agy on PATH', async () => {
    const runner = fakeRunner({ 'agy --version': { stdout: '1.0.3\n' } })
    expect(await antigravityCli.detect(context({ runner }))).toEqual(installed)
  })

  it("falls back to the installer's binary on each platform", async () => {
    const runner = fakeRunner({ '/home/me/.local/bin/agy --version': { stdout: '1.0.3' } })
    expect(await antigravityCli.detect(context({ runner }))).toMatchObject({ command: '/home/me/.local/bin/agy' })
    expect(await antigravityCli.detect(context())).toEqual({ installed: false, command: '/home/me/.local/bin/agy' })
    expect(
      await antigravityCli.detect(context({ platform: 'win32', env: { LOCALAPPDATA: 'C:/Users/me/AppData/Local' } })),
    ).toEqual({ installed: false, command: 'C:/Users/me/AppData/Local/agy/bin/agy.exe' })
  })
})

describe('antigravityCli.plan', () => {
  it('installs with the official script, then writes MCP servers in the mcp_config.json shape', async () => {
    const missing = { installed: false, command: '/home/me/.local/bin/agy' }
    const plan = await antigravityCli.plan(config({ mcpServers: SERVERS }), missing, context())
    expect(plan.steps[0]).toEqual({
      kind: 'command',
      title: { key: 'step.install', params: { tool: 'antigravity-cli' } },
      command: 'bash',
      args: ['-c', 'set -o pipefail; curl -fsSL https://antigravity.google/cli/install.sh | bash'],
    })
    expect(plan.steps.slice(1)).toEqual([
      {
        kind: 'file',
        title: { key: 'step.mcpAdd', params: { name: 'local' } },
        path: MCP_FILE,
        format: 'json',
        edits: [{ path: ['mcpServers', 'local'], value: { command: 'npx', args: ['-y', 'pkg'], env: { TOKEN: 't' } } }],
      },
      {
        kind: 'file',
        title: { key: 'step.mcpAdd', params: { name: 'docs' } },
        path: MCP_FILE,
        format: 'json',
        edits: [
          {
            path: ['mcpServers', 'docs'],
            value: { serverUrl: 'https://docs.example.com/mcp', headers: { Authorization: 'Bearer t' } },
          },
        ],
      },
      {
        kind: 'file',
        title: { key: 'step.mcpAdd', params: { name: 'bare' } },
        path: MCP_FILE,
        format: 'json',
        // Empty args and env are left out, and there is never a `type`.
        edits: [{ path: ['mcpServers', 'bare'], value: { command: 'server', args: undefined, env: undefined } }],
      },
    ])
  })

  it('uses the PowerShell installer and the LOCALAPPDATA binary on Windows', async () => {
    const ctx = context({ platform: 'win32', env: { LOCALAPPDATA: 'C:/Users/me/AppData/Local' } })
    const status = await antigravityCli.detect(ctx)
    const plan = await antigravityCli.plan(config({ mcpServers: { bare: SERVERS.bare! } }), status, ctx)
    expect(plan.steps[0]).toMatchObject({
      command: 'powershell',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'irm https://antigravity.google/cli/install.ps1 | iex',
      ],
    })
    expect(plan.steps[1]).toMatchObject({ kind: 'file', path: MCP_FILE })
  })

  it('does nothing for an empty config on an installed tool', async () => {
    expect(await antigravityCli.plan(config({}), installed, context())).toEqual({
      tool: 'antigravity-cli',
      steps: [],
      notices: [],
    })
  })

  it('says there is no language setting when the config language is Chinese', async () => {
    const plan = await antigravityCli.plan(config({ configLanguage: 'zh-CN' }), installed, context())
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.languageNotSupported', params: { tool: 'antigravity-cli', language: 'zh-CN' } },
      },
    ])
  })

  it('writes no provider and names the manual env-var route instead', async () => {
    const provider = { name: 'GLM', apiKey: 'sk-agy', gemini: { baseUrl: 'https://gw.example.com', model: 'm' } }
    const plan = await antigravityCli.plan(config({ provider }), installed, context())
    expect(plan.steps).toEqual([])
    expect(plan.notices).toEqual([
      {
        level: 'info',
        message: {
          key: 'notice.providerEnvOnly',
          params: { tool: 'antigravity-cli', file: '~/.gemini/antigravity-cli/settings.json' },
        },
      },
    ])
    expect(JSON.stringify(plan)).not.toContain('sk-agy')
  })

  it('edits an existing server field by field, keeping user keys and other servers', async () => {
    const before = [
      '{',
      '  // shared with the Antigravity App',
      '  "mcpServers": {',
      '    "other": { "serverUrl": "https://other.example.com" },',
      '    "local": { "command": "node", "args": ["old.js"], "disabled": true, "enabledTools": ["a"] },',
      '    "docs": { "command": "was-stdio", "disabled": true }',
      '  }',
      '}',
      '',
    ].join('\n')
    const plan = await antigravityCli.plan(
      config({ mcpServers: { local: SERVERS.local!, docs: SERVERS.docs! } }),
      installed,
      context({}, { [MCP_FILE]: before }),
    )
    expect((plan.steps as FileStep[]).map(step => step.edits)).toEqual([
      [
        { path: ['mcpServers', 'local', 'command'], value: 'npx' },
        { path: ['mcpServers', 'local', 'args'], value: ['-y', 'pkg'] },
        { path: ['mcpServers', 'local', 'env'], value: { TOKEN: 't' } },
      ],
      // A change of transport replaces the entry.
      [
        {
          path: ['mcpServers', 'docs'],
          value: { serverUrl: 'https://docs.example.com/mcp', headers: { Authorization: 'Bearer t' } },
        },
      ],
    ])
  })

  it('leaves an identical server alone', async () => {
    const before =
      '{\n\t"mcpServers": {\n\t\t"local": { "command": "npx", "args": ["-y", "pkg"], "env": { "TOKEN": "t" } }\n\t}\n}\n'
    const plan = await antigravityCli.plan(
      config({ mcpServers: { local: SERVERS.local! } }),
      installed,
      context({}, { [MCP_FILE]: before }),
    )
    expect(plan.steps).toEqual([])
  })

  it('installs skills for antigravity-cli into ~/.gemini/config/skills', async () => {
    const plan = await antigravityCli.plan(
      config({ skills: [{ source: 'owner/a', skills: ['one'] }, { source: 'owner/b' }] }),
      installed,
      context({}, { [join(HOME, '.gemini', 'config', 'skills', 'one', 'SKILL.md')]: '# one' }),
    )
    expect((plan.steps as CommandStep[]).map(step => [step.command, ...step.args].join(' '))).toEqual([
      'npx -y skills add owner/b -g -y -a antigravity-cli',
    ])
  })
})

describe('antigravityCli on the real filesystem', () => {
  it('keeps comments, user keys and other servers in mcp_config.json, and backs it up', async () => {
    const home = await tempDir()
    const file = join(home, '.gemini', 'config', 'mcp_config.json')
    const before = [
      '{',
      '  // shared with the Antigravity App',
      '  "mcpServers": {',
      '    "other": { "serverUrl": "https://other.example.com" },',
      '    "local": { "command": "node", "disabled": true }',
      '  }',
      '}',
      '',
    ].join('\n')
    await mkdir(join(file, '..'), { recursive: true })
    await writeFile(file, before)

    const runner = fakeRunner({ 'agy --version': { stdout: '1.0.3' } })
    const ctx = context({ home, runner, readFile: path => readFile(path, 'utf8').catch(() => undefined) })
    const plan = await planTools(config({ tools: ['antigravity-cli'], mcpServers: { local: SERVERS.local! } }), ctx)
    const backupDir = await tempDir()
    const [result] = await applyPlan(plan, { runner, backupDir, home })
    expect(result!.ok).toBe(true)

    const after = await readFile(file, 'utf8')
    expect(after).toContain('// shared with the Antigravity App')
    expect(after).toContain('"other": { "serverUrl": "https://other.example.com" },')
    expect(after).toContain('"disabled": true')
    expect(after).toContain('"TOKEN": "t"')
    expect(await readdir(join(backupDir, '.gemini', 'config'))).toEqual(['mcp_config.json'])
    expect(await readFile(join(backupDir, '.gemini', 'config', 'mcp_config.json'), 'utf8')).toBe(before)
  })
})

describe('antigravityCli.planUpdate and planUninstall', () => {
  it('says the CLI updates itself, or notes a missing install', async () => {
    expect(await antigravityCli.planUpdate(installed, context())).toEqual({
      tool: 'antigravity-cli',
      steps: [],
      notices: [{ level: 'info', message: { key: 'notice.selfUpdates', params: { tool: 'antigravity-cli' } } }],
    })
    const missing = await antigravityCli.planUpdate({ installed: false, command: 'agy' }, context())
    expect(missing.notices).toMatchObject([{ message: { key: 'notice.notInstalled' } }])
  })

  it('removes only the binary', async () => {
    const plan = await antigravityCli.planUninstall(installed, context(), undefined)
    expect(plan.steps).toEqual([
      {
        kind: 'remove',
        title: { key: 'step.deleteFile', params: { tool: 'antigravity-cli', file: 'agy' } },
        path: '/home/me/.local/bin/agy',
      },
    ])
  })
})
