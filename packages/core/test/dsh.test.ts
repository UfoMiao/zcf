import { describe, expect, it } from 'vitest'

import { dsh } from '../src/adapters/dsh'
import type { AdapterContext } from '../src/adapters/types'
import { editYaml, JsExpression, QuotedString } from '../src/io/editors'
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
  it('says dsh has no setting of its own when the config language is Chinese', async () => {
    const plan = await dsh.plan(config({ configLanguage: 'zh-CN' }), installed, context())
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.languageNotSupported', params: { tool: 'dsh', language: 'zh-CN' } },
      },
    ])
    // English is what every tool does on its own, so nothing is said or written.
    expect((await dsh.plan(config({ configLanguage: 'en' }), installed, context())).notices).toEqual([])
  })

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
    // The new home patch outranks dsh's Models page, which writes to the profile's patch.
    expect(plan.notices).toEqual([
      { level: 'info', message: { key: 'notice.dshHomePatch', params: { tool: 'dsh', file: 'cordis.patch.yml' } } },
    ])
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
    const plan = await dsh.plan(config({ provider: openaiProvider }), installed, ctx)
    expect(plan.notices).toEqual([])
    const after = await editYaml(before, patchStep(plan.steps).edits)
    expect(after).toContain("# my overrides\n- id: hmr\n  disabled: !!js 'false'\n")
    expect(after).toContain('      mine:\n        apiKeyEnv: MINE_KEY\n      zcf:\n')
    expect(after).toContain('    provider: zcf\n    model: deepseek-chat\n    reasoningEffort: high\n')
    expect(after.match(/^- id: /gm)).toHaveLength(3)
  })

  it('edits the last of several patches for one entry, the one dsh applies', async () => {
    const before = [
      '- id: agent-default-model',
      '  config: { provider: a, model: a }',
      '- id: agent-default-model',
      '  config: { provider: b, model: b }',
      '',
    ].join('\n')
    const ctx = context({}, { [PATCH]: before })
    const step = patchStep((await dsh.plan(config({ provider: openaiProvider }), installed, ctx)).steps)
    expect(step.edits.slice(-2)).toEqual([
      { path: [1, 'config', 'provider'], value: 'zcf' },
      { path: [1, 'config', 'model'], value: 'deepseek-chat' },
    ])
  })

  it('replaces an empty or !!js providers table with one that holds its route', async () => {
    const files = ['', " !!js 'routes()'"].map(providers => `- id: llm-pi-ai\n  config:\n    providers:${providers}\n`)
    const plans = await Promise.all(
      files.map(before => dsh.plan(config({ provider: openaiProvider }), installed, context({}, { [PATCH]: before }))),
    )
    const edits = plans.map(plan => patchStep(plan.steps).edits)
    for (const edit of edits)
      expect(edit[0]).toMatchObject({ path: [0, 'config', 'providers'], value: { zcf: { api: 'openai-completions' } } })
    const written = await Promise.all(files.map((before, index) => editYaml(before, edits[index]!)))
    for (const text of written) expect(text).toContain('    providers:\n      zcf:\n')
  })

  it('leaves a patch file that is not a list alone', async () => {
    const plan = await dsh.plan(
      config({ provider: openaiProvider, mcpServers: { a: { type: 'stdio', command: 'a' } } }),
      installed,
      context({}, { [PATCH]: 'llm-pi-ai: {}\n' }),
    )
    expect(plan.steps).toEqual([])
    expect(plan.notices).toEqual([
      { level: 'warning', message: { key: 'notice.fileNotList', params: { tool: 'dsh', file: 'cordis.patch.yml' } } },
    ])
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
    const { edits } = patchStep(plan.steps)
    expect(edits[0]).toMatchObject({
      value: {
        config: {
          providers: {
            zcf: {
              api: 'anthropic-messages',
              baseURL: 'https://relay.example.com',
              headers: { Authorization: new JsExpression('`Bearer ${process.env.ZCF_API_KEY}`') },
            },
          },
        },
      },
    })
    // The key stays in .env; the patch file only names the variable.
    const written = await editYaml(undefined, edits)
    expect(written).toContain('Authorization: !!js "`Bearer ${process.env.ZCF_API_KEY}`"')
    expect(written).not.toContain('sk-relay')
  })

  it('takes the Anthropic or OpenAI protocol, since dsh does not serve Gemini', async () => {
    const gemini = { name: 'G', apiKey: 'k', gemini: { model: 'gemini-3-pro' } }
    const only = await dsh.plan(config({ provider: gemini }), installed, context())
    expect(only.steps).toEqual([])
    expect(only.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.providerMissingProtocol', params: { tool: 'dsh', protocol: 'anthropic / openai' } },
      },
    ])
    const both = await dsh.plan(
      config({ provider: { ...openaiProvider, gemini: gemini.gemini } }),
      installed,
      context(),
    )
    expect(patchStep(both.steps).edits[0]).toMatchObject({
      value: { config: { providers: { zcf: { api: 'openai-completions' } } } },
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
                    // Quoted, so a preview can mask it.
                    env: { TOKEN: new QuotedString('t') },
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

  it('reads ${NAME} references from the environment and skips names dsh cannot load', async () => {
    const long = 'x'.repeat(33)
    const plan = await dsh.plan(
      config({
        mcpServers: {
          gh: { type: 'stdio', command: 'gh-mcp', env: { GITHUB_TOKEN: '${GITHUB_TOKEN}', PLAIN: 'a`b' } },
          api: { type: 'http', url: 'https://a.example.com', headers: { Authorization: 'Bearer ${API_TOKEN}' } },
          [long]: { type: 'stdio', command: 'x' },
        },
      }),
      installed,
      context(),
    )
    expect(plan.notices).toEqual([
      { level: 'warning', message: { key: 'notice.mcpNameTooLong', params: { tool: 'dsh', name: long, max: 32 } } },
    ])
    const { edits } = patchStep(plan.steps)
    expect(edits).toMatchObject([
      {
        value: {
          insert: [
            {
              config: {
                env: {
                  GITHUB_TOKEN: new JsExpression("`${process.env.GITHUB_TOKEN ?? ''}`"),
                  PLAIN: new QuotedString('a`b'),
                },
              },
            },
            { config: { headers: { Authorization: new JsExpression("`Bearer ${process.env.API_TOKEN ?? ''}`") } } },
          ],
        },
      },
    ])

    // Applied and planned again, nothing changes.
    const written = await editYaml(undefined, edits)
    const again = await dsh.plan(
      config({
        mcpServers: {
          gh: { type: 'stdio', command: 'gh-mcp', env: { GITHUB_TOKEN: '${GITHUB_TOKEN}', PLAIN: 'a`b' } },
          api: { type: 'http', url: 'https://a.example.com', headers: { Authorization: 'Bearer ${API_TOKEN}' } },
        },
      }),
      installed,
      context({}, { [PATCH]: written }),
    )
    expect(again.steps).toEqual([])
  })

  it('plans nothing for a file it wrote before', async () => {
    const relay = {
      name: 'Relay',
      apiKey: 'sk-relay',
      anthropic: { baseUrl: 'https://relay.example.com', authType: 'auth_token' as const },
      models: { default: 'claude-sonnet-5' },
    }
    const first = await dsh.plan(config({ provider: relay }), installed, context())
    const written = await editYaml(undefined, patchStep(first.steps).edits)
    const again = await dsh.plan(config({ provider: relay }), installed, context({}, { [PATCH]: written }))
    expect(again.steps.filter(step => step.kind === 'file' && step.format === 'yaml')).toEqual([])
  })

  it('updates the last of several inserted entries for one server', async () => {
    const entry = '    - id: zcf-mcp-a\n      config: { serverName: a, transport: stdio, command: old, args: [] }\n'
    const before = `- insert:\n${entry}- insert:\n${entry}${entry}`
    const plan = await dsh.plan(
      config({ mcpServers: { a: { type: 'stdio', command: 'new' } } }),
      installed,
      context({}, { [PATCH]: before }),
    )
    expect(patchStep(plan.steps).edits.map(edit => edit.path)).toEqual([[1, 'insert', 1, 'config']])
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
        serial: 'npx-skills',
      },
    ])
  })
})

describe('dsh.planUpdate', () => {
  it('updates dsh with npm, since it has no updater of its own', async () => {
    expect((await dsh.planUpdate(installed, context())).steps).toEqual([
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

  it('reports a missing install', async () => {
    expect((await dsh.planUpdate({ installed: false, command: 'dsh' }, context())).notices).toEqual([
      { level: 'info', message: { key: 'notice.notInstalled', params: { tool: 'dsh' } } },
    ])
  })
})
