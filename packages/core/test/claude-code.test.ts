import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { claudeCode, claudeMcpServer } from '../src/adapters/claude-code'
import type { AdapterContext } from '../src/adapters/types'
import { editJson } from '../src/io/editors'
import type { CommandStep, FileStep } from '../src/plan/types'
import type { McpServer, ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner } from './helpers'

const HOME = '/home/me'

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

const installed = { installed: true, command: 'claude', version: '2.1.0' }

describe('claudeCode.detect', () => {
  it('finds claude on PATH', async () => {
    const runner = fakeRunner({
      'claude --version': { stdout: '2.1.3 (Claude Code)\n' },
    })
    expect(await claudeCode.detect(context({ runner }))).toEqual({
      installed: true,
      command: 'claude',
      version: '2.1.3',
    })
  })

  it('falls back to the native install location', async () => {
    const runner = fakeRunner({
      '/home/me/.local/bin/claude --version': { stdout: 'weird output' },
    })
    expect(await claudeCode.detect(context({ runner }))).toEqual({
      installed: true,
      command: '/home/me/.local/bin/claude',
      version: undefined,
    })
  })

  it('reports a missing install and where it will land', async () => {
    expect(await claudeCode.detect(context())).toEqual({ installed: false, command: '/home/me/.local/bin/claude' })
    expect(await claudeCode.detect(context({ platform: 'win32' }))).toEqual({
      installed: false,
      command: '/home/me/.local/bin/claude.exe',
    })
  })
})

describe('claudeCode.plan', () => {
  it('installs with the official installer first when missing', async () => {
    const linux = await claudeCode.plan(config({}), { installed: false, command: 'x' }, context())
    expect(linux.steps).toEqual([
      {
        kind: 'command',
        title: {
          key: 'step.install',
          params: { tool: 'claude-code' },
        },
        command: 'bash',
        args: ['-c', 'set -o pipefail; curl -fsSL https://claude.ai/install.sh | bash'],
      },
    ])

    const windows = await claudeCode.plan(
      config({}),
      { installed: false, command: 'x' },
      context({ platform: 'win32' }),
    )
    expect(windows.steps[0]).toMatchObject({
      command: 'powershell',
      args: expect.arrayContaining(['irm https://claude.ai/install.ps1 | iex']),
    })
  })

  it('installs from npm with the China mirror, checks the binary, and then calls claude from PATH', async () => {
    const mcp = config({ mcpServers: { ctx: { type: 'http', url: 'https://mcp.example.com' } } })
    for (const platform of ['linux', 'win32'] as const) {
      // oxlint-disable-next-line no-await-in-loop
      const plan = await claudeCode.plan(
        mcp,
        { installed: false, command: 'x' },
        context({ platform, mirror: 'china' }),
      )
      expect(plan.steps.map(step => step.kind === 'command' && [step.command, ...step.args.slice(0, 2)])).toEqual([
        ['npm', 'install', '-g'],
        ['claude', '--version'],
        ['claude', 'mcp', 'add-json'],
      ])
      // npm 12 skips the postinstall that links the native binary unless it is allowed.
      expect((plan.steps[0] as CommandStep).args).toEqual([
        'install',
        '-g',
        '--allow-scripts=@anthropic-ai/claude-code',
        '@anthropic-ai/claude-code',
      ])
      expect(plan.steps[1]!.title).toEqual({ key: 'step.verify', params: { tool: 'claude-code' } })
    }
  })

  it('does nothing for an empty config on an installed tool', async () => {
    expect(await claudeCode.plan(config({}), installed, context())).toEqual({
      tool: 'claude-code',
      steps: [],
      notices: [],
    })
  })

  it('writes the provider into settings.json env and clears keys ZCF owns', async () => {
    const plan = await claudeCode.plan(
      config({
        provider: {
          name: 'GLM',
          apiKey: 'secret',
          anthropic: { baseUrl: 'https://example.com/anthropic' },
          models: { default: 'glm-4.7', haiku: 'glm-4.5-air' },
        },
      }),
      installed,
      context(),
    )

    const step = plan.steps[0] as FileStep
    expect(step).toMatchObject({
      kind: 'file',
      path: join(HOME, '.claude', 'settings.json'),
      format: 'json',
    })
    const before =
      '{\n  "env": {\n    "ANTHROPIC_API_KEY": "old",\n    "ANTHROPIC_DEFAULT_OPUS_MODEL": "old",\n    "KEEP": "1"\n  }\n}\n'
    expect(JSON.parse(editJson(before, step.edits))).toEqual({
      env: {
        KEEP: '1',
        ANTHROPIC_BASE_URL: 'https://example.com/anthropic',
        ANTHROPIC_AUTH_TOKEN: 'secret',
        ANTHROPIC_MODEL: 'glm-4.7',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
      },
    })
    // A fresh install has no settings.json yet.
    expect(JSON.parse(editJson(undefined, step.edits)).env.ANTHROPIC_AUTH_TOKEN).toBe('secret')
  })

  it('uses ANTHROPIC_API_KEY for api_key providers', async () => {
    const plan = await claudeCode.plan(
      config({
        provider: {
          name: 'Anthropic',
          apiKey: 'sk-ant',
          anthropic: { baseUrl: 'https://api.anthropic.com', authType: 'api_key' },
        },
      }),
      installed,
      context(),
    )
    const env = JSON.parse(editJson(undefined, (plan.steps[0] as FileStep).edits)).env
    expect(env).toEqual({ ANTHROPIC_BASE_URL: 'https://api.anthropic.com', ANTHROPIC_API_KEY: 'sk-ant' })
  })

  it('warns when the provider has no Anthropic endpoint', async () => {
    const plan = await claudeCode.plan(
      config({
        provider: {
          name: 'OpenAI',
          apiKey: 'k',
          openai: { baseUrl: 'https://api.openai.com/v1' },
        },
      }),
      installed,
      context(),
    )
    expect(plan.steps).toEqual([])
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: {
          key: 'notice.providerMissingProtocol',
          params: { tool: 'claude-code', protocol: 'anthropic' },
        },
      },
    ])
  })

  it('adds MCP servers with claude mcp, skipping identical ones and replacing changed ones', async () => {
    const files = {
      [join(HOME, '.claude.json')]: JSON.stringify({
        mcpServers: {
          same: {
            command: 'uvx',
            args: ['same'],
          },
          changed: { type: 'http', url: 'https://old.example.com' },
        },
      }),
    }
    const plan = await claudeCode.plan(
      config({
        mcpServers: {
          same: {
            type: 'stdio',
            command: 'uvx',
            args: ['same'],
          },
          changed: { type: 'http', url: 'https://new.example.com' },
          fresh: {
            type: 'stdio',
            command: 'node',
            args: ['server.js'],
            env: { TOKEN: 't' },
          },
        },
      }),
      installed,
      context({}, files),
    )

    expect((plan.steps as CommandStep[]).map(step => [step.title.key, ...step.args])).toEqual([
      ['step.mcpRemove', 'mcp', 'remove', 'changed', '--scope', 'user'],
      [
        'step.mcpAdd',
        'mcp',
        'add-json',
        'changed',
        '{"type":"http","url":"https://new.example.com","headers":{}}',
        '--scope',
        'user',
      ],
      [
        'step.mcpAdd',
        'mcp',
        'add-json',
        'fresh',
        '{"type":"stdio","command":"node","args":["server.js"],"env":{"TOKEN":"t"}}',
        '--scope',
        'user',
      ],
    ])
    expect((plan.steps as CommandStep[]).every(step => step.command === 'claude')).toBe(true)
  })

  it('treats only real entries of ~/.claude.json as existing servers, and backs that file up first', async () => {
    const plan = await claudeCode.plan(
      config({ mcpServers: { toString: { type: 'http' as const, url: 'https://a.example.com' } } }),
      installed,
      context({}, { [join(HOME, '.claude.json')]: '{"mcpServers":{}}' }),
    )
    expect(plan.steps).toMatchObject([{ title: { key: 'step.mcpAdd' }, touches: [join(HOME, '.claude.json')] }])
  })

  it('follows CLAUDE_CONFIG_DIR for settings, state and skills', async () => {
    const dir = '/data/claude'
    const plan = await claudeCode.plan(
      config({
        provider: { name: 'p', apiKey: 'sk-test-123456', anthropic: { baseUrl: 'https://api.example.com' } },
        mcpServers: { docs: { type: 'http' as const, url: 'https://a.example.com' } },
        skills: [{ source: 'owner/repo', skills: ['one'] }],
      }),
      installed,
      context(
        { env: { CLAUDE_CONFIG_DIR: dir } },
        {
          [join(dir, '.claude.json')]: '{"mcpServers":{"docs":{"type":"http","url":"https://a.example.com"}}}',
          [join(dir, 'skills', 'one', 'SKILL.md')]: '# one',
        },
      ),
    )
    expect(plan.steps).toMatchObject([{ kind: 'file', path: join(dir, 'settings.json') }])
  })

  it('uses the freshly installed binary for MCP steps', async () => {
    const plan = await claudeCode.plan(
      config({
        mcpServers: {
          a: { type: 'http', url: 'https://a.example.com' },
        },
      }),
      { installed: false, command: '/home/me/.local/bin/claude' },
      context(),
    )
    expect(plan.steps.map(step => step.kind === 'command' && step.command)).toEqual([
      'bash',
      '/home/me/.local/bin/claude',
    ])
  })

  it('installs skills through the skills CLI unless every named skill is present', async () => {
    const files = { [join(HOME, '.claude', 'skills', 'present', 'SKILL.md')]: '---\nname: present\n---\n' }
    const plan = await claudeCode.plan(
      config({
        skills: [
          { source: 'owner/all' },
          {
            source: 'owner/done',
            skills: ['present'],
          },
          {
            source: 'owner/partial',
            skills: ['present', 'absent'],
          },
        ],
      }),
      installed,
      context({}, files),
    )

    expect((plan.steps as CommandStep[]).map(step => [step.command, ...step.args].join(' '))).toEqual([
      'npx -y skills add owner/all -g -y -a claude-code',
      'npx -y skills add owner/partial -g -y -a claude-code -s present -s absent',
    ])
  })
})

describe('claudeMcpServer', () => {
  it('wraps package-runner shims with cmd /c on Windows', () => {
    const server: McpServer = {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'pkg'],
      env: {},
    }
    expect(claudeMcpServer(server, 'win32')).toEqual({
      type: 'stdio',
      command: 'cmd',
      args: ['/c', 'npx', '-y', 'pkg'],
      env: {},
    })
    expect(claudeMcpServer(server, 'darwin')).toEqual({
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'pkg'],
      env: {},
    })
    expect(claudeMcpServer({ ...server, command: 'node' }, 'win32')).toMatchObject({ command: 'node' })
  })
})

describe('claudeCode.planUpdate', () => {
  it('runs claude update', () => {
    expect(claudeCode.planUpdate(installed, context()).steps).toEqual([
      {
        kind: 'command',
        title: {
          key: 'step.update',
          params: { tool: 'claude-code' },
        },
        command: 'claude',
        args: ['update'],
      },
    ])
  })

  it('only notes a missing install', () => {
    expect(claudeCode.planUpdate({ installed: false, command: 'claude' }, context())).toEqual({
      tool: 'claude-code',
      steps: [],
      notices: [
        {
          level: 'info',
          message: {
            key: 'notice.notInstalled',
            params: { tool: 'claude-code' },
          },
        },
      ],
    })
  })
})
