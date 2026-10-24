import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import type { CommandResult, CommandRunner } from '@zcf/core'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { EXIT_ERROR, EXIT_INVALID_CONFIG, EXIT_OK, main } from '../src/main'

// Strip colors so assertions read plainly.
// oxlint-disable-next-line no-control-regex
const plain = (text: string) => text.replace(/\x1B\[[\d;]*m/g, '')

let home: string
let calls: string[][]
let responses: Record<string, Partial<CommandResult>>

const runner: CommandRunner = {
  async run(command, args) {
    calls.push([command, ...args])
    const response = responses[[command, ...args].join(' ')]
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
  let stdout = ''
  let stderr = ''
  const code = await main(argv, {
    stdout: {
      write: text => void (stdout += text),
    },
    stderr: {
      write: text => void (stderr += text),
    },
    context: { home, platform: 'linux', env: {}, runner },
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
    expect(stdout).toContain('! DeepSeek Harness is not supported yet.')
    expect(stdout).not.toContain('sk-very-secret')
    expect(stdout).not.toContain('hidden-token')
    expect(calls).toEqual([['claude', '--version']])
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
    expect(calls).toEqual([['claude', '--version']])
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
    expect(first.stdout).toContain('Done. 2 steps applied, 0 already up to date.')
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
    expect(stdout).toContain('! DeepSeek Harness is not supported yet.')
    expect(stdout).toContain('✓ Claude Code: Update Claude Code')
    expect(calls).toContainEqual(['claude', 'update'])
  })

  it('takes tools from the config and needs at least one', async () => {
    await writeConfig({ version: 1 })
    expect(await run('update')).toMatchObject({
      code: EXIT_ERROR,
      stderr: expect.stringContaining('No tools selected'),
    })
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
