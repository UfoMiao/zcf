import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { codex } from '../src/adapters/codex'
import type { AdapterContext } from '../src/adapters/types'
import { editToml } from '../src/io/editors'
import type { CommandStep, FileStep } from '../src/plan/types'
import type { ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner } from './helpers'

const HOME = '/home/me'
const CONFIG = join(HOME, '.codex', 'config.toml')

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

const installed = { installed: true, command: 'codex', version: '0.164.0' }

function commandLines(steps: readonly unknown[]): string[] {
  return (steps as CommandStep[]).map(step => [step.command, ...step.args].join(' '))
}

describe('codex.detect', () => {
  it('finds codex on PATH', async () => {
    const runner = fakeRunner({ 'codex --version': { stdout: 'codex-cli 0.164.0\n' } })
    expect(await codex.detect(context({ runner }))).toEqual({ installed: true, command: 'codex', version: '0.164.0' })
  })

  it('reports a missing install', async () => {
    expect(await codex.detect(context())).toEqual({ installed: false, command: 'codex' })
  })
})

describe('codex.plan', () => {
  it('installs from npm first when missing', async () => {
    const plan = await codex.plan(config({}), { installed: false, command: 'codex' }, context())
    expect(commandLines(plan.steps)).toEqual(['npm install -g @openai/codex'])
  })

  it('does nothing for an empty config on an installed tool', async () => {
    expect(await codex.plan(config({}), installed, context())).toEqual({ tool: 'codex', steps: [], notices: [] })
  })

  it('writes a zcf model provider into config.toml, keeping the rest of the file', async () => {
    const plan = await codex.plan(
      config({
        provider: {
          name: 'GLM',
          apiKey: 'sk-secret',
          openai: { baseUrl: 'https://example.com/v1', model: 'glm-4.7' },
          models: { default: 'ignored' },
        },
      }),
      installed,
      context(),
    )

    expect(plan.notices).toEqual([])
    const step = plan.steps[0] as FileStep
    expect(step).toMatchObject({ kind: 'file', path: CONFIG, format: 'toml' })

    const before = [
      '# my settings',
      'model = "gpt-5"',
      'approval_policy = "never"',
      '',
      '[model_providers.zcf]',
      'name = "Old"',
      'env_key = "OLD_KEY"',
      '',
      '[mcp_servers.docs]',
      'command = "node"',
      '',
    ].join('\n')
    expect(await editToml(before, step.edits)).toBe(
      [
        '# my settings',
        'model = "glm-4.7"',
        'approval_policy = "never"',
        'model_provider = "zcf"',
        '',
        '[model_providers.zcf]',
        'name = "GLM"',
        'base_url = "https://example.com/v1"',
        'wire_api = "responses"',
        'experimental_bearer_token = "sk-secret"',
        '',
        '[mcp_servers.docs]',
        'command = "node"',
        '',
      ].join('\n'),
    )
  })

  it('falls back to models.default and warns when there is no model at all', async () => {
    const provider = { name: 'P', apiKey: 'k', openai: { baseUrl: 'https://example.com/v1' } }
    const withDefault = await codex.plan(
      config({ provider: { ...provider, models: { default: 'm1' } } }),
      installed,
      context(),
    )
    expect((withDefault.steps[0] as FileStep).edits).toContainEqual({ path: ['model'], value: 'm1' })

    const without = await codex.plan(config({ provider }), installed, context())
    expect((without.steps[0] as FileStep).edits.map(edit => edit.path[0])).not.toContain('model')
    expect(without.notices).toEqual([
      { level: 'warning', message: { key: 'notice.modelMissing', params: { tool: 'codex', protocol: 'openai' } } },
    ])
  })

  it('warns when the provider has no OpenAI endpoint', async () => {
    const plan = await codex.plan(
      config({ provider: { name: 'A', apiKey: 'k', anthropic: { baseUrl: 'https://example.com' } } }),
      installed,
      context(),
    )
    expect(plan.steps).toEqual([])
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.providerMissingProtocol', params: { tool: 'codex', protocol: 'openai' } },
      },
    ])
  })

  it('says Codex has no setting of its own when the config language is Chinese', async () => {
    const plan = await codex.plan(config({ configLanguage: 'zh-CN' }), installed, context())
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.languageNotSupported', params: { tool: 'codex', language: 'zh-CN' } },
      },
    ])
    // English is what every tool does on its own, so nothing is said or written.
    expect((await codex.plan(config({ configLanguage: 'en' }), installed, context())).notices).toEqual([])
  })

  it('follows CODEX_HOME', async () => {
    const plan = await codex.plan(
      config({ provider: { name: 'P', apiKey: 'k', openai: { baseUrl: 'https://example.com/v1', model: 'm' } } }),
      installed,
      context({ env: { CODEX_HOME: '/data/codex' } }),
    )
    expect(plan.steps[0]).toMatchObject({ path: join('/data/codex', 'config.toml') })
  })

  it('adds MCP servers with codex mcp add, skipping identical ones', async () => {
    const files = {
      [CONFIG]: [
        '[mcp_servers.same]',
        'command = "uvx"',
        'args = ["same"]',
        'startup_timeout_sec = 30',
        '',
        '[mcp_servers.changed]',
        'url = "https://old.example.com"',
        '',
      ].join('\n'),
    }
    const plan = await codex.plan(
      config({
        mcpServers: {
          same: { type: 'stdio', command: 'uvx', args: ['same'] },
          changed: { type: 'http', url: 'https://new.example.com' },
          fresh: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', 'pkg'],
            env: { TOKEN: 'a=b "c"', 'FOO.BAR': 'x' },
          },
        },
      }),
      installed,
      context({}, files),
    )

    expect(plan.steps.map(step => step.kind === 'command' && step.args)).toEqual([
      ['mcp', 'add', 'changed', '--url', 'https://new.example.com'],
      ['mcp', 'add', 'fresh', '--env', 'TOKEN=a=b "c"', '--env', 'FOO.BAR=x', '--', 'npx', '-y', 'pkg'],
    ])
    expect(plan.steps).toMatchObject([{ touches: [CONFIG] }, { touches: [CONFIG] }])
  })

  it('passes npx as it is on Windows, since Codex resolves .cmd shims itself', async () => {
    const plan = await codex.plan(
      config({ mcpServers: { s: { type: 'stdio', command: 'npx', args: ['pkg'] } } }),
      installed,
      context({ platform: 'win32' }),
    )
    expect(commandLines(plan.steps)).toEqual(['codex mcp add s -- npx pkg'])
  })

  it('writes HTTP headers into config.toml after adding the server, quoting keys as needed', async () => {
    const plan = await codex.plan(
      config({
        mcpServers: {
          api: {
            type: 'http',
            url: 'https://api.example.com/mcp',
            headers: { Authorization: 'Bearer t', 'X.Key': 'v' },
          },
        },
      }),
      installed,
      context(),
    )
    expect(plan.steps[0]).toMatchObject({
      kind: 'command',
      args: ['mcp', 'add', 'api', '--url', 'https://api.example.com/mcp'],
    })
    const headers = plan.steps[1] as FileStep
    expect(headers).toMatchObject({ kind: 'file', path: CONFIG, title: { key: 'step.mcpHeaders' } })

    // What `codex mcp add` leaves behind, then the header edit on top.
    const added = '[mcp_servers.api]\nurl = "https://api.example.com/mcp"\n'
    expect(await editToml(added, headers.edits)).toBe(
      '[mcp_servers.api]\nurl = "https://api.example.com/mcp"\nhttp_headers = { Authorization = "Bearer t", "X.Key" = "v" }\n',
    )
  })

  it('skips an HTTP server whose headers already match', async () => {
    const files = {
      [CONFIG]: '[mcp_servers.api]\nurl = "https://a.example.com"\nhttp_headers = { A = "1" }\n',
    }
    const plan = await codex.plan(
      config({ mcpServers: { api: { type: 'http', url: 'https://a.example.com', headers: { A: '1' } } } }),
      installed,
      context({}, files),
    )
    expect(plan.steps).toEqual([])
  })

  it('uses the freshly installed command for MCP steps and installs skills for codex', async () => {
    const plan = await codex.plan(
      config({
        mcpServers: { a: { type: 'http', url: 'https://a.example.com' } },
        skills: [{ source: 'owner/repo', skills: ['present'] }, { source: 'owner/all' }],
      }),
      { installed: false, command: 'codex' },
      context({}, { [join(HOME, '.agents', 'skills', 'present', 'SKILL.md')]: '# present' }),
    )
    expect(commandLines(plan.steps)).toEqual([
      'npm install -g @openai/codex',
      'codex mcp add a --url https://a.example.com',
      'npx -y skills add owner/all -g -y -a codex',
    ])
  })
})

describe('codex.planUpdate', () => {
  it('runs codex update', async () => {
    expect(commandLines((await codex.planUpdate(installed, context())).steps)).toEqual(['codex update'])
  })

  it('only notes a missing install', async () => {
    expect(await codex.planUpdate({ installed: false, command: 'codex' }, context())).toEqual({
      tool: 'codex',
      steps: [],
      notices: [{ level: 'info', message: { key: 'notice.notInstalled', params: { tool: 'codex' } } }],
    })
  })
})
