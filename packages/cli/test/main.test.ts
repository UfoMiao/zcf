import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { backupRunDir, BackupRun, type CommandResult, type CommandRunner } from '@zcf/core'
import { render } from 'ink'
import { dirname, join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { MainOptions } from '../src/main'
import { EXIT_ERROR, EXIT_INVALID_CONFIG, EXIT_OK, main } from '../src/main'

// The real Ink loop never exits in a test; mount is all `zcf tui` does on its own.
vi.mock('ink', async importOriginal => {
  const actual = await importOriginal<typeof import('ink')>()
  return {
    ...actual,
    render: vi.fn<() => { waitUntilExit: () => Promise<void>; unmount: () => void }>(() => ({
      waitUntilExit: () => Promise.resolve(),
      unmount: () => {},
    })),
  }
})

// Strip colors so assertions read plainly.
// oxlint-disable-next-line no-control-regex
const plain = (text: string) => text.replace(/\x1B\[[\d;]*m/g, '')

let home: string
let calls: string[][]
let envs: (Record<string, string> | undefined)[]
let env: Record<string, string>
/** Canned results by command line; a function answers each call afresh, for output that changes. */
let responses: Record<string, Partial<CommandResult> | (() => Partial<CommandResult>)>

const runner: CommandRunner = {
  async run(command, args, options) {
    calls.push([command, ...args])
    envs.push(options?.env)
    const canned = responses[[command, ...args].join(' ')]
    const response = typeof canned === 'function' ? canned() : canned
    return response
      ? {
          exitCode: 0,
          stdout: '',
          stderr: '',
          ...response,
        }
      : { exitCode: undefined, stdout: '', stderr: 'not found' }
  },
}

async function run(...argv: string[]) {
  return runWith({}, ...argv)
}

async function runWith(extra: MainOptions, ...argv: string[]) {
  let stdout = ''
  let stderr = ''
  const code = await main(argv, {
    ...extra,
    stdout: {
      write: text => void (stdout += text),
    },
    stderr: {
      write: text => void (stderr += text),
    },
    context: { home, platform: 'linux', env, runner },
    now: () => new Date('2026-10-24T08:00:00.000Z'),
  })
  return {
    code,
    stdout: plain(stdout),
    stderr: plain(stderr),
  }
}

async function writeConfig(config: unknown, path = join(home, '.ufomiao', 'zcf', 'zcf.json')) {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, JSON.stringify(config))
}

const mountedApp = () => {
  const node = vi.mocked(render).mock.calls.at(-1)?.[0]
  return node && typeof node === 'object' && 'props' in node ? (node.props as Record<string, unknown>) : undefined
}

const fullConfig = {
  version: 1,
  tools: ['claude-code', 'dsh'],
  provider: {
    name: 'GLM',
    apiKey: 'sk-very-secret',
    anthropic: { baseUrl: 'https://example.com/anthropic' },
  },
  mcpServers: {
    ctx: {
      type: 'http',
      url: 'https://mcp.example.com',
      headers: { Authorization: 'Bearer hidden-token' },
    },
  },
}

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'zcf-cli-'))
  calls = []
  envs = []
  env = {}
  responses = {
    'claude --version': { stdout: '2.1.0' },
  }
})

afterEach(async () => {
  await rm(home, { recursive: true, force: true })
})

describe('zcf plan', () => {
  it('shows steps, diffs and notices without touching anything, and hides secrets', async () => {
    await writeConfig(fullConfig)
    const { code, stdout } = await run('plan')

    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('Claude Code')
    expect(stdout).toContain('1. Use provider "GLM" (new file)')
    expect(stdout).toContain('~/.claude/settings.json')
    expect(stdout).toContain('+    "ANTHROPIC_AUTH_TOKEN": "sk-***et"')
    expect(stdout).toContain('2. Add MCP server "ctx"')
    expect(stdout).toContain(
      '$ claude mcp add-json ctx \'{"type":"http","url":"https://mcp.example.com","headers":{"Authorization":"Bea***en"}}\' --scope user',
    )
    expect(stdout).toContain('1. Install DeepSeek Harness')
    expect(stdout).toContain('~/.dsh/cordis.patch.yml')
    expect(stdout).not.toContain('sk-very-secret')
    expect(stdout).not.toContain('hidden-token')
    expect(calls).toEqual([
      ['claude', '--version'],
      ['dsh', '--version'],
    ])
  })

  it('masks short MCP credentials in a YAML file', async () => {
    await writeConfig({
      version: 1,
      tools: ['dsh'],
      mcpServers: { db: { type: 'stdio', command: 'db-mcp', env: { PW: 'abc' } } },
    })
    const { stdout } = await run('plan')
    expect(stdout).toContain('PW: "***"')
    expect(stdout).not.toContain('abc')
  })

  it('masks credentials already in the native config, not only the new ones', async () => {
    await writeConfig(fullConfig)
    await mkdir(join(home, '.claude'))
    await writeFile(
      join(home, '.claude', 'settings.json'),
      '{\n  "env": {\n    "ANTHROPIC_API_KEY": "sk-old-credential",\n    "OTHER_TOKEN": "kept-token-value"\n  }\n}\n',
    )
    const { stdout } = await run('plan', '--tools', 'claude-code')
    expect(stdout).toContain('-    "ANTHROPIC_API_KEY": "sk-***al"')
    expect(stdout).not.toContain('sk-old-credential')
    expect(stdout).not.toContain('kept-token-value')
  })

  it('names a broken native config file in the chosen language', async () => {
    await writeConfig(fullConfig)
    await mkdir(join(home, '.claude'))
    await writeFile(join(home, '.claude', 'settings.json'), '{\n  "env": ')
    const { code, stderr } = await run('plan', '--lang', 'zh-CN', '--tools', 'claude-code')
    expect(code).toBe(EXIT_ERROR)
    expect(stderr).toContain(`${join(home, '.claude', 'settings.json')} 不是有效的 JSON（第 2 行，第 10 列）`)
  })

  it('speaks Chinese with --lang zh-CN', async () => {
    await writeConfig(fullConfig)
    const { stdout } = await run('plan', '--lang', 'zh-CN', '--tools', 'claude-code')
    expect(stdout).toContain('使用供应商「GLM」')
    expect(stdout).not.toContain('DeepSeek Harness')
  })

  it('installs the built-in skills in the config language, whatever --lang says', async () => {
    await writeConfig({
      version: 1,
      tools: ['claude-code'],
      configLanguage: 'zh-CN',
      skills: [{ source: 'zcf', skills: ['git-commit'] }],
    })
    // The interface language is English; the templates follow the config language.
    const { stdout } = await run('plan', '--tools', 'claude-code')
    expect(stdout).toContain('Install skills from zcf')
    expect(stdout).toMatch(/templates[\\/]skills[\\/]zh-CN/)
  })

  it('reads the config from --file', async () => {
    const path = join(home, 'custom.json')
    await writeConfig(
      {
        version: 1,
        tools: ['claude-code'],
      },
      path,
    )
    const { code, stdout } = await run('plan', '--file', path)
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('Everything is already up to date.')
  })

  it('exits 2 for a missing or invalid config', async () => {
    const missing = await run('plan')
    expect(missing.code).toBe(EXIT_INVALID_CONFIG)
    expect(missing.stderr).toContain('No ZCF config at')

    await writeConfig({
      version: 1,
      tools: ['vscode'],
    })
    const invalid = await run('plan')
    expect(invalid.code).toBe(EXIT_INVALID_CONFIG)
    expect(invalid.stderr).toContain('is not valid:')
    expect(invalid.stderr).toContain(
      '  - tools.0: must be "claude-code" | "codex" | "gemini-cli" | "opencode" | "cursor" | "pi" | "dsh"',
    )
  })

  it('explains config problems in the chosen language', async () => {
    await writeConfig({ version: 1, provider: { name: 'x', apiKey: '', anthropic: { baseUrl: 'sk-misplaced' } } })
    const invalid = await run('plan', '--lang', 'zh-CN')
    expect(invalid.code).toBe(EXIT_INVALID_CONFIG)
    expect(invalid.stderr).toContain('  - provider.apiKey: 不能为空')
    expect(invalid.stderr).toContain('  - provider.anthropic.baseUrl: 必须是有效的 URL')
    expect(invalid.stderr).not.toContain('sk-misplaced')

    await writeFile(join(home, '.ufomiao', 'zcf', 'zcf.json'), '{\n  "version": ')
    const broken = await run('plan', '--lang', 'zh-CN')
    expect(broken.code).toBe(EXIT_INVALID_CONFIG)
    expect(broken.stderr).toContain('  - JSON 语法错误：第 2 行，第 14 列')
  })

  it('labels unexpected errors in the chosen language', async () => {
    const { code, stderr } = await run('plan', '--lang', 'zh-CN', '--file', home)
    expect(code).toBe(EXIT_ERROR)
    expect(stderr).toMatch(/^意外错误：.*EISDIR/)
  })

  it('exits 1 for unknown or missing tools', async () => {
    await writeConfig({ version: 1 })
    expect(await run('plan', '--tools', 'claude-code,vscode')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('Unknown tools: vscode'),
    })
    expect(await run('plan')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('No tools selected'),
    })
  })
})

describe('zcf apply', () => {
  it('only previews without --yes', async () => {
    await writeConfig(fullConfig)
    const { code, stdout } = await run('apply')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('Nothing was changed. Run again with --yes to apply.')
    expect(calls).toEqual([
      ['claude', '--version'],
      ['dsh', '--version'],
    ])
  })

  it('applies with --yes, backs up changed files, and is idempotent', async () => {
    await writeConfig(fullConfig)
    await mkdir(join(home, '.claude'))
    await writeFile(join(home, '.claude', 'settings.json'), '{\n  "theme": "dark"\n}\n')
    responses[
      'claude mcp add-json ctx {"type":"http","url":"https://mcp.example.com","headers":{"Authorization":"Bearer hidden-token"}} --scope user'
    ] = {}

    const first = await run('apply', '--yes', '--tools', 'claude-code')
    expect(first.code).toBe(EXIT_OK)
    expect(first.stdout).toContain('✓ Claude Code: Use provider "GLM"')
    expect(first.stdout).toContain('✓ Claude Code: Add MCP server "ctx"')
    expect(first.stdout).toContain('Done: 2 applied, 0 already up to date.')
    expect(first.stdout).toContain('~/.ufomiao/zcf/backups/2026-10-24T08-00-00-000Z')

    const settings = JSON.parse(await readFile(join(home, '.claude', 'settings.json'), 'utf8'))
    expect(settings).toEqual({
      theme: 'dark',
      env: { ANTHROPIC_BASE_URL: 'https://example.com/anthropic', ANTHROPIC_AUTH_TOKEN: 'sk-very-secret' },
    })
    expect(
      await readFile(
        join(home, '.ufomiao', 'zcf', 'backups', '2026-10-24T08-00-00-000Z', '.claude', 'settings.json'),
        'utf8',
      ),
    ).toBe('{\n  "theme": "dark"\n}\n')

    // Claude Code now has the server, so a second run has nothing to do.
    await writeFile(
      join(home, '.claude.json'),
      JSON.stringify({
        mcpServers: {
          ctx: {
            type: 'http',
            url: 'https://mcp.example.com',
            headers: { Authorization: 'Bearer hidden-token' },
          },
        },
      }),
    )
    const second = await run('apply', '--yes', '--tools', 'claude-code')
    expect(second.stdout).toContain('Everything is already up to date.')
  })

  it('exits 1 and shows the error when a step fails', async () => {
    await writeConfig({ ...fullConfig, provider: undefined })
    responses[
      'claude mcp add-json ctx {"type":"http","url":"https://mcp.example.com","headers":{"Authorization":"Bearer hidden-token"}} --scope user'
    ] = { exitCode: 1, stderr: 'Error: hidden-token rejected' }

    const { code, stdout } = await run('apply', '-y', '--tools', 'claude-code')
    expect(code).toBe(EXIT_ERROR)
    expect(stdout).toContain('✗ Claude Code: Add MCP server "ctx"')
    expect(stdout).toContain('Error: hid***en rejected')
    expect(stdout).not.toContain('hidden-token')
    expect(stdout).toContain('Not every tool finished (1 failed).')
  })
})

describe('zcf update', () => {
  it("runs each tool's updater", async () => {
    responses['claude update'] = {}
    const { code, stdout } = await run('update', '--tools', 'claude-code,dsh')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('DeepSeek Harness is not installed.')
    expect(stdout).toContain('Claude Code: Update Claude Code')
    // The tool that was not installed is reported, but not counted as up to date;
    // Claude Code's unchanged updater is the one up-to-date entry.
    expect(stdout).toContain('Done: 0 applied, 1 already up to date.')
    expect(calls).toContainEqual(['claude', 'update'])
  })

  it('says when the updater found nothing newer', async () => {
    responses['claude --version'] = { stdout: '2.1.0 (Claude Code)' }
    responses['claude update'] = {}
    const { code, stdout } = await run('update', '--tools', 'claude-code')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('Claude Code is already up to date (2.1.0).')
    expect(stdout).not.toContain('✓ Claude Code: Update Claude Code')
    expect(stdout).toContain('· Claude Code: Update Claude Code')
    expect(stdout).toContain('Done: 0 applied, 1 already up to date.')
  })

  it('only reports an unchanged version after an npm install', async () => {
    responses['gemini --version'] = { stdout: '0.65.0' }
    responses['npm install -g @google/gemini-cli@latest'] = {}
    const { code, stdout } = await run('update', '--tools', 'gemini-cli')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('Gemini CLI still reports 0.65.0 after the npm install.')
    expect(stdout).toContain('Done: 1 applied, 0 already up to date.')
  })

  it('shows the version a tool was updated to', async () => {
    let installed = '2.1.0'
    responses['claude --version'] = () => ({ stdout: `${installed} (Claude Code)` })
    responses['claude update'] = () => {
      installed = '2.1.3'
      return {}
    }
    const { code, stdout } = await run('update', '--tools', 'claude-code')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('Claude Code updated from 2.1.0 to 2.1.3.')
    expect(stdout).toContain('Done: 1 applied, 0 already up to date.')
  })

  it('takes tools from the config and needs at least one', async () => {
    await writeConfig({ version: 1 })
    expect(await run('update')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('No tools selected'),
    })
  })

  it('falls back to npm when the updater fails on an npm install', async () => {
    responses['claude update'] = { exitCode: 1, stderr: 'updater broke' }
    responses['npm ls -g @anthropic-ai/claude-code --depth=0'] = {}
    responses['npm install -g --allow-scripts=@anthropic-ai/claude-code @anthropic-ai/claude-code@latest'] = {}
    const { code, stdout } = await run('update', '--tools', 'claude-code')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('✗ Claude Code: Update Claude Code')
    expect(stdout).toContain('✓ Claude Code: Update Claude Code with npm instead')
    expect(calls).toContainEqual([
      'npm',
      'install',
      '-g',
      '--allow-scripts=@anthropic-ai/claude-code',
      '@anthropic-ai/claude-code@latest',
    ])
  })

  it('says nothing about a fallback that never ran', async () => {
    responses['npm ls -g @anthropic-ai/claude-code --depth=0'] = {}
    responses['claude update'] = {}
    const { stdout } = await run('update', '--tools', 'claude-code')
    expect(stdout).not.toContain('with npm instead')
  })
})

describe('zcf uninstall', () => {
  it('shows the plan and changes nothing without --yes', async () => {
    responses['npm ls -g @anthropic-ai/claude-code --depth=0'] = {}
    const { code, stdout } = await run('uninstall', 'claude-code')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('1. Uninstall Claude Code')
    expect(stdout).toContain('npm uninstall -g @anthropic-ai/claude-code')
    expect(stdout).toContain('Nothing was changed. Run again with --yes to apply.')
    expect(calls).not.toContainEqual(['npm', 'uninstall', '-g', '@anthropic-ai/claude-code'])
  })

  it('uninstalls and takes the tool out of the config', async () => {
    let uninstalled = false
    responses['claude --version'] = () => (uninstalled ? { exitCode: 1, stderr: 'gone' } : { stdout: '2.1.0' })
    responses['npm ls -g @anthropic-ai/claude-code --depth=0'] = {}
    responses['npm uninstall -g @anthropic-ai/claude-code'] = () => {
      uninstalled = true
      return {}
    }
    await writeConfig({ version: 1, tools: ['claude-code', 'codex'] })
    const { code, stdout } = await run('uninstall', 'claude-code', '--yes')
    expect(code).toBe(EXIT_OK)
    expect(calls).toContainEqual(['npm', 'uninstall', '-g', '@anthropic-ai/claude-code'])
    expect(stdout).toContain('Removed Claude Code from "tools"')
    expect(JSON.parse(await readFile(configFile(), 'utf8')).tools).toEqual(['codex'])
  })

  it('keeps a tool in the config when its uninstall fails', async () => {
    responses['npm ls -g @anthropic-ai/claude-code --depth=0'] = {}
    responses['npm uninstall -g @anthropic-ai/claude-code'] = { exitCode: 1, stderr: 'nope' }
    await writeConfig({ version: 1, tools: ['claude-code'] })
    const { code } = await run('uninstall', 'claude-code', '--yes')
    expect(code).toBe(EXIT_ERROR)
    expect(JSON.parse(await readFile(configFile(), 'utf8')).tools).toEqual(['claude-code'])
  })

  it('says so when a copy still runs after uninstalling', async () => {
    responses['npm ls -g @anthropic-ai/claude-code --depth=0'] = {}
    responses['npm uninstall -g @anthropic-ai/claude-code'] = {}
    const { code, stdout } = await run('uninstall', 'claude-code', '--yes')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('Claude Code still runs after uninstalling')
  })

  it('says there is nothing to uninstall for a tool that is not installed', async () => {
    responses['claude --version'] = { exitCode: 1, stderr: 'gone' }
    const { code, stdout } = await run('uninstall', 'claude-code', '--yes')
    expect(code).toBe(EXIT_OK)
    expect(stdout).toContain('Nothing to uninstall.')
  })

  it('names a broken config instead of guessing the tools list', async () => {
    responses['claude --version'] = { stdout: '2.1.0' }
    responses['npm ls -g @anthropic-ai/claude-code --depth=0'] = {}
    responses['npm uninstall -g @anthropic-ai/claude-code'] = {}
    await mkdir(join(configFile(), '..'), { recursive: true })
    const broken = '{ "version": 1, "tools": ["claude-code"],, }'
    await writeFile(configFile(), broken)
    const { code, stderr } = await run('uninstall', 'claude-code', '--yes')
    expect(code).toBe(EXIT_ERROR)
    expect(stderr).toContain('~/.ufomiao/zcf/zcf.json is not valid JSON')
    expect(await readFile(configFile(), 'utf8')).toBe(broken)
  })

  it('masks the secrets the uninstall preview shows', async () => {
    responses['gemini --version'] = { stdout: '0.65.0' }
    responses['npm ls -g @google/gemini-cli --depth=0'] = {}
    await mkdir(join(home, '.gemini'), { recursive: true })
    await writeFile(
      join(home, '.gemini', '.env'),
      'GEMINI_API_KEY=sk-gemini-secret-1\nGOOGLE_GEMINI_BASE_URL=https://gw\n',
    )
    await writeConfig({
      version: 1,
      provider: { name: 'GLM', apiKey: 'sk-gemini-secret-1', gemini: { baseUrl: 'https://gw' } },
    })
    const { stdout } = await run('uninstall', 'gemini-cli')
    expect(stdout).not.toContain('sk-gemini-secret-1')
    expect(stdout).toContain('sk-***-1')
  })

  it('rejects unknown tools and an empty list', async () => {
    expect(await run('uninstall', 'nope')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('Unknown tools'),
    })
    expect(await run('uninstall')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('No tools selected'),
    })
  })
})

/** The environment the last `claude update` ran with; a version check follows it, so it is not the last call. */
function updateEnv() {
  return envs[calls.findLastIndex(call => call.join(' ') === 'claude update')]
}

function configFile() {
  return join(home, '.ufomiao', 'zcf', 'zcf.json')
}

describe('mirrors', () => {
  const registry = { npm_config_registry: 'https://registry.npmmirror.com' }

  it('shows the official sources by default', async () => {
    expect(await run('mirror')).toMatchObject({
      code: EXIT_OK,
      stdout: expect.stringContaining('Download mirror: official - official sources (default)'),
    })
  })

  it('switches the mirror in the config, creating it when missing', async () => {
    const set = await run('mirror', 'china')
    expect(set.code).toBe(EXIT_OK)
    expect(set.stdout).toContain('Download mirror set to China mirrors in ~/.ufomiao/zcf/zcf.json.')
    expect(JSON.parse(await readFile(configFile(), 'utf8'))).toEqual({ version: 1, mirror: 'china' })
    expect((await run('mirror')).stdout).toContain(
      'Download mirror: china - China mirrors (from ~/.ufomiao/zcf/zcf.json)',
    )
  })

  it('changes only the mirror key of an existing config', async () => {
    await mkdir(join(configFile(), '..'), { recursive: true })
    await writeFile(configFile(), '{\n  // mine\n  "version": 1,\n  "mirror": "china",\n  "tools": ["codex"]\n}\n')
    const { stdout } = await run('mirror', 'official', '--lang', 'zh-CN')
    expect(stdout).toContain('已在 ~/.ufomiao/zcf/zcf.json 中把下载源设为官方源。')
    expect(await readFile(configFile(), 'utf8')).toBe(
      '{\n  // mine\n  "version": 1,\n  "mirror": "official",\n  "tools": ["codex"]\n}\n',
    )
    // The previous version is backed up like any other file ZCF changes.
    expect(stdout).toContain('~/.ufomiao/zcf/backups/2026-10-24T08-00-00-000Z')
    expect(
      await readFile(
        join(home, '.ufomiao', 'zcf', 'backups', '2026-10-24T08-00-00-000Z', '.ufomiao', 'zcf', 'zcf.json'),
        'utf8',
      ),
    ).toContain('"mirror": "china"')
  })

  it('credits the config only when it names a mirror', async () => {
    await writeConfig({ version: 1 })
    expect((await run('mirror')).stdout).toContain('Download mirror: official - official sources (default)')
    expect((await run('mirror', 'CN')).stdout).toContain('Download mirror set to China mirrors')
  })

  it('leaves a broken config alone and names it', async () => {
    await mkdir(join(configFile(), '..'), { recursive: true })
    await writeFile(configFile(), '{ "version": 1,, }')
    expect(await run('mirror', 'china')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('~/.ufomiao/zcf/zcf.json is not valid JSON (line 1, column 16)'),
    })
    expect(await readFile(configFile(), 'utf8')).toBe('{ "version": 1,, }')
  })

  it('starts an empty config afresh and refuses one that is not an object', async () => {
    await mkdir(join(configFile(), '..'), { recursive: true })
    await writeFile(configFile(), '\n')
    expect((await run('mirror', 'china')).code).toBe(EXIT_OK)
    expect(JSON.parse(await readFile(configFile(), 'utf8'))).toEqual({ version: 1, mirror: 'china' })

    await writeFile(configFile(), '[]')
    expect(await run('mirror', 'china')).toMatchObject({
      code: EXIT_INVALID_CONFIG,
      stderr: expect.stringContaining('is not valid'),
    })
    expect(await readFile(configFile(), 'utf8')).toBe('[]')
  })

  it('warns about a ZCF_MIRROR it does not know', async () => {
    env = { ZCF_MIRROR: 'chian' }
    expect((await run('mirror')).stdout).toContain(
      'ZCF_MIRROR=chian is not a mirror (official, china), so it is ignored.',
    )
  })

  it('says when ZCF_MIRROR overrides the config, and rejects unknown mirrors', async () => {
    env = { ZCF_MIRROR: 'china' }
    expect((await run('mirror')).stdout).toContain('Download mirror: china - China mirrors (from ZCF_MIRROR)')
    expect((await run('mirror', 'official')).stdout).toContain('ZCF_MIRROR=china is set, so it still decides')
    expect(await run('mirror', 'mars')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('Unknown mirror: mars. Choose from official, china.'),
    })
    expect(await run('plan', '--mirror', 'mars')).toMatchObject({ code: EXIT_ERROR })
  })

  it('installs through the mirror set in the config', async () => {
    await writeConfig({ version: 1, tools: ['claude-code'], mirror: 'china' })
    const install = ['npm', 'install', '-g', '--allow-scripts=@anthropic-ai/claude-code', '@anthropic-ai/claude-code']
    responses = { [install.join(' ')]: {} }
    const { code, stdout } = await run('apply', '--yes')
    expect(stdout).toContain(
      'Downloading through China mirrors: npm packages from https://registry.npmmirror.com, GitHub clones from gh-proxy.com.',
    )
    expect(stdout).toContain(`$ ${install.join(' ')}`)
    expect(calls).toContainEqual(install)
    expect(envs[calls.findIndex(call => call.join(' ') === install.join(' '))]).toEqual(registry)
    // npm succeeded but `claude` does not answer, as when npm skips its postinstall: the check step fails.
    expect(code).toBe(EXIT_ERROR)
    expect(stdout).toContain('✗ Claude Code: Check that Claude Code runs')
  })

  it('uses --mirror for one run, and the npm registry the user set', async () => {
    await writeConfig({ version: 1, tools: ['claude-code'] })
    expect((await run('plan')).stdout).not.toContain('China mirrors')
    expect((await run('plan', '--mirror', 'china')).stdout).toContain(
      'npm packages from https://registry.npmmirror.com',
    )
    env = { npm_config_registry: 'https://me:s3cret@npm.example.com/path/?token=abc' }
    const own = await run('plan', '--mirror', 'china')
    expect(own.stdout).toContain('npm packages from https://npm.example.com, GitHub clones from gh-proxy.com')
    expect(own.stdout).not.toContain('s3cret')
    expect(own.stdout).not.toContain('abc')
  })

  it("updates through the config's mirror, also with --tools", async () => {
    await writeConfig({ version: 1, mirror: 'china' })
    responses['claude update'] = {}
    const china = await run('update', '--tools', 'claude-code')
    expect(china.code).toBe(EXIT_OK)
    expect(china.stdout).toContain('a native install still downloads from its official servers')
    expect(updateEnv()).toEqual(registry)
    expect((await run('update', '--tools', 'claude-code', '--mirror', 'official')).code).toBe(EXIT_OK)
    expect(updateEnv()).toBeUndefined()

    // With --tools a broken config does not stop the update, but its mirror is not used.
    await writeConfig({ version: 1, mirror: 'china', tools: ['nope'] })
    const broken = await run('update', '--tools', 'claude-code')
    expect(broken.stdout).toContain('could not be read, so its mirror setting is not used')
    expect(updateEnv()).toBeUndefined()
  })
})

describe('help and unknown commands', () => {
  it('explains argument mistakes in the chosen language', async () => {
    await writeConfig(fullConfig)
    expect(await run('plan', '--lang', 'zh-CN', '--unknown')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('未知选项 --unknown'),
    })
    expect(await run('plan', '--lang', 'zh-CN', '--file')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('选项 --file <path> 缺少值'),
    })
    expect(await run('plan', 'extra')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('Unexpected arguments: extra. Run zcf --help'),
    })
  })

  it('prints help', async () => {
    let stdout = ''
    const original = console.info
    const originalLog = console.log
    console.info = console.log = (text: string) => void (stdout += text)
    try {
      expect((await run()).code).toBe(EXIT_OK)
      expect((await run('--help')).code).toBe(EXIT_OK)
      expect((await run('nope')).code).toBe(EXIT_ERROR)
    } finally {
      console.info = original
      console.log = originalLog
    }
    expect(stdout).toContain('One config for all your AI coding tools')
  })

  it('only opens the interactive UI in a terminal', async () => {
    expect(await run('tui')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('The interactive UI needs a terminal'),
    })
  })

  it('mounts the interactive UI in the startup language, pinned by --lang', async () => {
    // The config language only reaches the UI once the app loads it; startup follows --lang/locale.
    await writeConfig({ version: 1, language: 'zh-CN' })
    expect((await runWith({ interactive: true }, 'tui')).code).toBe(EXIT_OK)
    expect(mountedApp()).toMatchObject({ lang: 'en', langPinned: false, home })

    expect((await runWith({ interactive: true }, 'tui', '--lang', 'zh-CN')).code).toBe(EXIT_OK)
    expect(mountedApp()).toMatchObject({ lang: 'zh-CN', langPinned: true })
  })

  it('serves the web UI on 127.0.0.1 until stopped, and opens the browser', async () => {
    const webRoot = join(home, 'web')
    await mkdir(webRoot, { recursive: true })
    await writeFile(join(webRoot, 'index.html'), '<!doctype html>')
    const opened: string[][] = []
    const openUrl = (command: string, args: string[]) => void opened.push([command, ...args])
    const result = await runWith({ webRoot, stop: Promise.resolve(), openUrl }, 'ui')
    expect(result).toMatchObject({
      code: EXIT_OK,
      stdout: expect.stringMatching(/ZCF is ready at http:\/\/127\.0\.0\.1:\d+\/#token=/),
    })
    expect(opened).toEqual([['xdg-open', expect.stringContaining('http://127.0.0.1:')]])

    expect((await runWith({ webRoot, stop: Promise.resolve(), openUrl }, 'ui', '--no-open')).code).toBe(EXIT_OK)
    expect(opened).toHaveLength(1)
  })

  it('refuses a port that is not a number', async () => {
    expect(await runWith({ stop: Promise.resolve() }, 'ui', '--port', '43l8')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('Not a port number: 43l8'),
    })
  })

  it('says so when the web UI files are missing', async () => {
    expect(await runWith({ webRoot: join(home, 'nowhere') }, 'ui')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('The web UI files are missing'),
    })
  })

  it('prints help in the chosen language', async () => {
    let stdout = ''
    const original = console.info
    console.info = (text: string) => void (stdout += text)
    try {
      expect((await run('--help', '--lang', 'zh-CN')).code).toBe(EXIT_OK)
      expect((await run('plan', '--help', '--lang', 'zh-CN')).code).toBe(EXIT_OK)
    } finally {
      console.info = original
    }
    for (const text of ['用法', '命令', '选项', '显示帮助信息', '显示版本号', '在任一命令后加上 `--help` 查看详情']) {
      expect(stdout).toContain(text)
    }
    expect(stdout).not.toMatch(/Usage|Options|Display this message|Display version number/)
  })
})

/** A run of backups as an apply would leave it: `files` written under home and snapshotted into the run. */
async function seedBackup(iso: string, files: [string, string][]) {
  const dir = backupRunDir(join(home, '.ufomiao', 'zcf', 'backups'), new Date(iso))
  const backup = new BackupRun(dir, home, () => new Date(iso), 'apply')
  await Promise.all(
    files.map(async ([rel, content]) => {
      const path = join(home, rel)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content)
      await backup.snapshot(path)
    }),
  )
  await backup.finish()
}

describe('zcf backup', () => {
  it('lists the runs newest first', async () => {
    await seedBackup('2026-10-20T08:00:00.000Z', [['.claude/settings.json', 'a']])
    await seedBackup('2026-10-21T08:00:00.000Z', [
      ['.claude/settings.json', 'b'],
      ['zcf.json', '{}'],
    ])
    const list = await run('backup')
    expect(list.code).toBe(EXIT_OK)
    expect(list.stdout).toContain('2026-10-21T08-00-00-000Z — an apply, 2 file(s)')
    expect(list.stdout.indexOf('2026-10-21T')).toBeLessThan(list.stdout.indexOf('2026-10-20T'))
    expect((await run('backup', 'list')).stdout).toContain('2026-10-20T08-00-00-000Z — an apply, 1 file(s)')
    // A run with nothing to back up leaves no folder behind.
    await seedBackup('2026-10-19T08:00:00.000Z', [])
    expect(await readdir(join(home, '.ufomiao', 'zcf', 'backups'))).not.toContain('2026-10-19T08-00-00-000Z')
  })

  it('says so when there are no backups yet', async () => {
    expect(await run('backup')).toMatchObject({
      code: EXIT_OK,
      stdout: expect.stringContaining('No backups yet.'),
    })
  })

  it('restores a run with --yes, backing up what is there first', async () => {
    await seedBackup('2026-10-21T08:00:00.000Z', [['.claude/settings.json', 'old']])
    await writeFile(join(home, '.claude', 'settings.json'), 'current')

    const ask = await run('backup', 'restore', '2026-10-21T08-00-00-000Z')
    expect(ask.code).toBe(EXIT_OK)
    expect(ask.stdout).toContain('Backup 2026-10-21T08-00-00-000Z — an apply, 1 file(s).')
    expect(ask.stdout).toContain('Run again with --yes')
    expect(await readFile(join(home, '.claude', 'settings.json'), 'utf8')).toBe('current')

    // The undo run takes the test's fixed time, one that no seeded run uses.
    const yes = await run('backup', 'restore', '2026-10-21T08-00-00-000Z', '--yes')
    expect(yes.code).toBe(EXIT_OK)
    expect(await readFile(join(home, '.claude', 'settings.json'), 'utf8')).toBe('old')
    expect(yes.stdout).toContain('Restored 1 changed file(s); 0 already matched; 0 were missing and are back.')
    expect(yes.stdout).toContain('~/.ufomiao/zcf/backups/2026-10-24T08-00-00-000Z')
    expect(
      await readFile(
        join(home, '.ufomiao', 'zcf', 'backups', '2026-10-24T08-00-00-000Z', '.claude', 'settings.json'),
        'utf8',
      ),
    ).toBe('current')
  })

  it('rejects unknown ids, a missing id, unknown subcommands and a bad keep', async () => {
    await seedBackup('2026-10-21T08:00:00.000Z', [['zcf.json', '{}']])
    expect(await run('backup', 'restore', 'nope')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('No backup with id nope'),
    })
    expect(await run('backup', 'restore')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('zcf backup restore <id>'),
    })
    expect(await run('backup', 'frobnicate')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('Unknown backup command: frobnicate'),
    })
    expect(await run('backup', 'prune', '--keep', 'x')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('Not a number of backups to keep: x'),
    })
  })

  it('prunes the oldest runs beyond --keep with --yes', async () => {
    await Promise.all([20, 21, 22].map(day => seedBackup(`2026-10-${day}T08:00:00.000Z`, [['zcf.json', '{}']])))

    const ask = await run('backup', 'prune', '--keep', '1')
    expect(ask.code).toBe(EXIT_OK)
    expect(ask.stdout).toContain('2 backup(s) to remove: 2026-10-21T08-00-00-000Z, 2026-10-20T08-00-00-000Z')
    expect(ask.stdout).toContain('Run again with --yes')

    const yes = await run('backup', 'prune', '--keep', '1', '--yes')
    expect(yes.code).toBe(EXIT_OK)
    expect(yes.stdout).toContain('Removed 2 backup(s): 2026-10-21T08-00-00-000Z, 2026-10-20T08-00-00-000Z')

    const after = await run('backup')
    expect(after.stdout).toContain('2026-10-22T08-00-00-000Z')
    expect(after.stdout).not.toContain('2026-10-20T')
    expect((await run('backup', 'prune', '--yes')).stdout).toContain('Nothing to prune; there are only 1 backup(s).')
  })
})
