import { describe, expect, it } from 'vitest'

import { dsh } from '../src/adapters/dsh'
import type { AdapterContext } from '../src/adapters/types'
import { editYaml } from '../src/io/editors'
import type { FileStep, PlanStep } from '../src/plan/types'
import type { ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner } from './helpers'

const HOME = '/home/me'
const PATCH = '/home/me/.dsh/cordis.patch.yml'

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

function patchStep(steps: PlanStep[]): FileStep {
  const step = steps.find(item => item.kind === 'file' && item.format === 'yaml')
  if (step?.kind !== 'file') throw new Error('no cordis.patch.yml step')
  return step
}

const installed = { installed: true, command: 'dsh', version: '0.2.1-rc.2' }
const openaiProvider = {
  name: 'DeepSeek',
  apiKey: 'sk-ds',
  openai: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
}

describe('dsh.detect', () => {
  it('finds dsh on PATH, keeping a prerelease version', async () => {
    const runner = fakeRunner({ 'dsh --version': { stdout: '0.2.1-rc.2\n' } })
    expect(await dsh.detect(context({ runner }))).toEqual(installed)
  })

  it('reports a missing install', async () => {
    expect(await dsh.detect(context())).toEqual({ installed: false, command: 'dsh' })
  })
})

describe('dsh.plan', () => {
  it('installs from npm first when missing, allowing the install scripts dsh needs', async () => {
    const plan = await dsh.plan(config({}), { installed: false, command: 'dsh' }, context())
    expect(plan.steps).toEqual([
      {
        kind: 'command',
        title: { key: 'step.install', params: { tool: 'dsh' } },
        command: 'npm',
        args: [
          'install',
          '-g',
          '--allow-scripts=@deepseek-ai/dsh-subprocess-local,koffi,node-pty,protobufjs,@google/genai',
          '@deepseek-ai/dsh',
        ],
      },
    ])
  })

  it('keeps the key in .env and adds a route and the default model to a new home patch file', async () => {
    const plan = await dsh.plan(config({ provider: openaiProvider }), installed, context())
    expect(plan.notices).toEqual([])
    expect(plan.steps).toEqual([
      {
        kind: 'file',
        title: { key: 'step.provider', params: { tool: 'dsh', provider: 'DeepSeek' } },
        path: '/home/me/.dsh/.env',
        format: 'env',
        edits: [{ path: ['ZCF_API_KEY'], value: 'sk-ds' }],
      },
      {
        kind: 'file',
        title: { key: 'step.writeConfig', params: { file: 'cordis.patch.yml' } },
        path: PATCH,
        format: 'yaml',
        edits: [
          {
            path: [0],
            value: {
              id: 'llm-pi-ai',
              config: {
                providers: {
                  zcf: {
                    displayName: 'DeepSeek',
                    apiKeyEnv: 'ZCF_API_KEY',
                    api: 'openai-completions',
                    baseURL: 'https://api.deepseek.com/v1',
                    models: [{ id: 'deepseek-chat' }],
                  },
                },
              },
            },
          },
          { path: [1], value: { id: 'agent-default-model', config: { provider: 'zcf', model: 'deepseek-chat' } } },
        ],
      },
    ])
  })

  it('edits the patches already in the file and keeps the routes and keys it does not own', async () => {
    const before = [
      '# my overrides',
      '- id: hmr',
      "  disabled: !!js 'false'",
      '- id: llm-pi-ai',
      '  config:',
      '    providers:',
      '      mine:',
      '        apiKeyEnv: MINE_KEY',
      '- id: agent-default-model',
      '  config:',
      '    provider: mine',
      '    model: old',
      '    reasoningEffort: high',
      '',
    ].join('\n')
    const ctx = context({}, { [PATCH]: before })
    const step = patchStep((await dsh.plan(config({ provider: openaiProvider }), installed, ctx)).steps)
    const after = await editYaml(before, step.edits)
    expect(after).toContain("# my overrides\n- id: hmr\n  disabled: !!js 'false'\n")
    expect(after).toContain('      mine:\n        apiKeyEnv: MINE_KEY\n      zcf:\n')
    expect(after).toContain('    provider: zcf\n    model: deepseek-chat\n    reasoningEffort: high\n')
    expect(after.match(/^- id: /gm)).toHaveLength(3)
  })

  it('replaces a config that is a !!js expression', async () => {
    const before = "- id: agent-default-model\n  config: !!js 'pick()'\n"
    const ctx = context({}, { [PATCH]: before })
    const step = patchStep((await dsh.plan(config({ provider: openaiProvider }), installed, ctx)).steps)
    expect(step.edits.at(-1)).toEqual({ path: [0, 'config'], value: { provider: 'zcf', model: 'deepseek-chat' } })
  })

  it('sends an Anthropic auth token as a bearer header', async () => {
    const plan = await dsh.plan(
      config({
        provider: {
          name: 'Relay',
          apiKey: 'sk-relay',
          anthropic: { baseUrl: 'https://relay.example.com' },
          models: { default: 'claude-sonnet-5' },
        },
      }),
      installed,
      context(),
    )
    expect(patchStep(plan.steps).edits[0]).toMatchObject({
      value: {
        config: {
          providers: {
            zcf: {
              api: 'anthropic-messages',
              baseURL: 'https://relay.example.com',
              headers: { Authorization: 'Bearer sk-relay' },
            },
          },
        },
      },
    })
  })

  it('explains why the provider is skipped', async () => {
    const plan = await dsh.plan(
      config({ provider: { name: 'P', apiKey: 'k', anthropic: { baseUrl: 'https://a.example.com' } } }),
      installed,
      context(),
    )
    expect(plan.steps).toEqual([])
    expect(plan.notices).toEqual([
      { level: 'warning', message: { key: 'notice.modelMissing', params: { tool: 'dsh', protocol: 'anthropic' } } },
    ])
  })

  it('inserts new MCP servers in one patch and updates the ones it added before', async () => {
    const before = [
      '- insert:',
      '    - id: zcf-mcp-same',
      "      name: '@deepseek-ai/dsh-mcp-client'",
      '      config: { serverName: same, transport: stdio, command: npx, args: [-y, same-mcp] }',
      '    - id: zcf-mcp-changed',
      "      name: '@deepseek-ai/dsh-mcp-client'",
      '      config: { serverName: changed, transport: streamable-http, url: https://old.example.com/mcp }',
      '',
    ].join('\n')
    const plan = await dsh.plan(
      config({
        mcpServers: {
          same: { type: 'stdio', command: 'npx', args: ['-y', 'same-mcp'] },
          changed: { type: 'http', url: 'https://new.example.com/mcp', headers: { Authorization: 'Bearer t' } },
          fresh: { type: 'stdio', command: 'uvx', args: ['x-mcp'], env: { TOKEN: 't' } },
          remote: { type: 'http', url: 'https://r.example.com/mcp' },
        },
      }),
      installed,
      context({}, { [PATCH]: before }),
    )
    expect(plan.steps).toEqual([
      {
        kind: 'file',
        title: { key: 'step.writeConfig', params: { file: 'cordis.patch.yml' } },
        path: PATCH,
        format: 'yaml',
        edits: [
          {
            path: [0, 'insert', 1, 'config'],
            value: {
              serverName: 'changed',
              transport: 'streamable-http',
              url: 'https://new.example.com/mcp',
              headers: { Authorization: 'Bearer t' },
            },
          },
          {
            path: [1],
            value: {
              insert: [
                {
                  id: 'zcf-mcp-fresh',
                  name: '@deepseek-ai/dsh-mcp-client',
                  config: {
                    serverName: 'fresh',
                    transport: 'stdio',
                    command: 'uvx',
                    args: ['x-mcp'],
                    env: { TOKEN: 't' },
                  },
                },
                {
                  id: 'zcf-mcp-remote',
                  name: '@deepseek-ai/dsh-mcp-client',
                  config: { serverName: 'remote', transport: 'streamable-http', url: 'https://r.example.com/mcp' },
                },
              ],
            },
          },
        ],
      },
    ])
  })

  it('leaves the file alone when nothing changes', async () => {
    const before =
      '- insert:\n    - id: zcf-mcp-a\n      config: { serverName: a, transport: stdio, command: a, args: [] }\n'
    const plan = await dsh.plan(
      config({ mcpServers: { a: { type: 'stdio', command: 'a' } } }),
      installed,
      context({}, { [PATCH]: before }),
    )
    expect(plan.steps).toEqual([])
  })

  it('follows DSH_HOME, including on Windows', async () => {
    const plan = await dsh.plan(
      config({ provider: openaiProvider }),
      installed,
      context({ platform: 'win32', home: 'C:/Users/me', env: { DSH_HOME: 'D:/dsh' } }),
    )
    expect(plan.steps.map(step => (step.kind === 'file' ? step.path : ''))).toEqual([
      'D:/dsh/.env',
      'D:/dsh/cordis.patch.yml',
    ])

    const tilde = await dsh.plan(
      config({ provider: openaiProvider }),
      installed,
      context({ env: { DSH_HOME: '~/dsh' } }),
    )
    expect(tilde.steps[0]).toMatchObject({ path: '/home/me/dsh/.env' })
  })

  it('installs skills into the shared Agent Skills folder that dsh reads', async () => {
    const plan = await dsh.plan(
      config({ skills: [{ source: 'owner/repo', skills: ['one'] }] }),
      installed,
      context({}, { '/home/me/.agents/skills/two/SKILL.md': '# two' }),
    )
    expect(plan.steps).toEqual([
      {
        kind: 'command',
        title: { key: 'step.skillsAdd', params: { source: 'owner/repo' } },
        command: 'npx',
        args: ['-y', 'skills', 'add', 'owner/repo', '-g', '-y', '-a', 'universal', '-s', 'one'],
      },
    ])
  })
})

describe('dsh.planUpdate', () => {
  it('updates dsh with npm, since it has no updater of its own', () => {
    expect(dsh.planUpdate(installed, context()).steps).toEqual([
      {
        kind: 'command',
        title: { key: 'step.update', params: { tool: 'dsh' } },
        command: 'npm',
        args: [
          'install',
          '-g',
          '--allow-scripts=@deepseek-ai/dsh-subprocess-local,koffi,node-pty,protobufjs,@google/genai',
          '@deepseek-ai/dsh@latest',
        ],
      },
    ])
  })

  it('reports a missing install', () => {
    expect(dsh.planUpdate({ installed: false, command: 'dsh' }, context()).notices).toEqual([
      { level: 'info', message: { key: 'notice.notInstalled', params: { tool: 'dsh' } } },
    ])
  })
})
