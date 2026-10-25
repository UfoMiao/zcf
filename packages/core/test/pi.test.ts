import { describe, expect, it } from 'vitest'

import { pi } from '../src/adapters/pi'
import type { AdapterContext } from '../src/adapters/types'
import { editJson } from '../src/io/editors'
import type { ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner } from './helpers'

const HOME = '/home/me'
const AGENT = '/home/me/.pi/agent'

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

const installed = { installed: true, command: 'pi', version: '1.4.0' }

describe('pi.detect', () => {
  it('finds pi on PATH', async () => {
    const runner = fakeRunner({ 'pi --version': { stdout: '1.4.0\n' } })
    expect(await pi.detect(context({ runner }))).toEqual({ installed: true, command: 'pi', version: '1.4.0' })
  })

  it('reports a missing install', async () => {
    expect(await pi.detect(context())).toEqual({ installed: false, command: 'pi' })
  })
})

describe('pi.plan', () => {
  it('installs from npm first when missing, on every platform', async () => {
    for (const platform of ['linux', 'win32'] as const) {
      // oxlint-disable-next-line no-await-in-loop
      const plan = await pi.plan(config({}), { installed: false, command: 'pi' }, context({ platform }))
      expect(plan.steps).toEqual([
        {
          kind: 'command',
          title: { key: 'step.install', params: { tool: 'pi' } },
          command: 'npm',
          args: ['install', '-g', '--ignore-scripts', '@earendil-works/pi-coding-agent'],
        },
      ])
    }
  })

  it('says pi has no setting of its own when the config language is Chinese', async () => {
    const plan = await pi.plan(config({ configLanguage: 'zh-CN' }), installed, context())
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.languageNotSupported', params: { tool: 'pi', language: 'zh-CN' } },
      },
    ])
    // English is what every tool does on its own, so nothing is said or written.
    expect((await pi.plan(config({ configLanguage: 'en' }), installed, context())).notices).toEqual([])
  })

  it('adds an Anthropic provider to models.json and makes it the default', async () => {
    const plan = await pi.plan(
      config({
        provider: {
          name: 'Relay',
          apiKey: 'sk-relay',
          anthropic: { baseUrl: 'https://relay.example.com/api' },
          models: { default: 'claude-sonnet-5' },
        },
      }),
      installed,
      context(),
    )
    expect(plan.notices).toEqual([])
    expect(plan.steps).toEqual([
      {
        kind: 'file',
        title: { key: 'step.provider', params: { tool: 'pi', provider: 'Relay' } },
        path: `${AGENT}/models.json`,
        format: 'json',
        edits: [
          {
            path: ['providers', 'zcf'],
            value: {
              name: 'Relay',
              baseUrl: 'https://relay.example.com/api',
              api: 'anthropic-messages',
              apiKey: 'sk-relay',
              // auth_token is the default, so the key is sent as a bearer token like ANTHROPIC_AUTH_TOKEN.
              authHeader: true,
              models: [{ id: 'claude-sonnet-5' }],
            },
          },
        ],
      },
      {
        kind: 'file',
        title: { key: 'step.defaultModel', params: { model: 'claude-sonnet-5' } },
        path: `${AGENT}/settings.json`,
        format: 'json',
        edits: [
          { path: ['defaultProvider'], value: 'zcf' },
          { path: ['defaultModel'], value: 'claude-sonnet-5' },
        ],
      },
    ])
  })

  it('falls back to OpenAI and Gemini when Anthropic has no model', async () => {
    const openai = await pi.plan(
      config({
        provider: {
          name: 'Mixed',
          apiKey: 'sk-x',
          anthropic: { baseUrl: 'https://a.example.com', authType: 'api_key' },
          openai: { baseUrl: 'https://o.example.com/v1', model: 'gpt-x' },
        },
      }),
      installed,
      context(),
    )
    expect(openai.steps[0]).toMatchObject({
      edits: [
        {
          value: { baseUrl: 'https://o.example.com/v1', api: 'openai-completions', models: [{ id: 'gpt-x' }] },
        },
      ],
    })
    expect(openai.steps[0]).not.toHaveProperty('edits.0.value.authHeader')

    const gemini = await pi.plan(
      config({ provider: { name: 'Google', apiKey: 'g-key', gemini: { model: 'gemini-3-pro' } } }),
      installed,
      context(),
    )
    expect(gemini.steps[0]).toMatchObject({
      edits: [
        {
          value: {
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            api: 'google-generative-ai',
            models: [{ id: 'gemini-3-pro' }],
          },
        },
      ],
    })

    const gateway = await pi.plan(
      config({ provider: { name: 'G', apiKey: 'k', gemini: { baseUrl: 'https://gw.example.com/', model: 'm' } } }),
      installed,
      context(),
    )
    expect(gateway.steps[0]).toMatchObject({ edits: [{ value: { baseUrl: 'https://gw.example.com/v1beta' } }] })
  })

  it('keeps a key with $ or a leading ! literal', async () => {
    const plan = await pi.plan(
      config({ provider: { name: 'P', apiKey: '!ab$c', openai: { baseUrl: 'https://o.example.com/v1', model: 'm' } } }),
      installed,
      context(),
    )
    expect(plan.steps[0]).toMatchObject({ edits: [{ value: { apiKey: '$!ab$$c' } }] })
  })

  it('explains why the provider is skipped', async () => {
    const noModel = await pi.plan(
      config({ provider: { name: 'P', apiKey: 'k', openai: { baseUrl: 'https://o.example.com/v1' } } }),
      installed,
      context(),
    )
    expect(noModel.steps).toEqual([])
    expect(noModel.notices).toEqual([
      { level: 'warning', message: { key: 'notice.modelMissing', params: { tool: 'pi', protocol: 'openai' } } },
    ])

    const noProtocol = await pi.plan(config({ provider: { name: 'P', apiKey: 'k' } }), installed, context())
    expect(noProtocol.notices).toEqual([
      {
        level: 'warning',
        message: {
          key: 'notice.providerMissingProtocol',
          params: { tool: 'pi', protocol: 'anthropic / openai / gemini' },
        },
      },
    ])
  })

  it('follows PI_CODING_AGENT_DIR and keeps the rest of models.json', async () => {
    const dir = 'C:/Users/me/pi-agent'
    const plan = await pi.plan(
      config({ provider: { name: 'P', apiKey: 'k', openai: { baseUrl: 'https://o.example.com/v1', model: 'm' } } }),
      installed,
      context({ platform: 'win32', home: 'C:/Users/me', env: { PI_CODING_AGENT_DIR: ` ${dir} ` } }),
    )
    expect(plan.steps.map(step => (step.kind === 'file' ? step.path : ''))).toEqual([
      `${dir}/models.json`,
      `${dir}/settings.json`,
    ])

    const existing =
      '{\n  // local models\n  "providers": {\n    "ollama": { "baseUrl": "http://localhost:11434/v1" }\n  }\n}\n'
    const step = plan.steps[0]!
    const after = step.kind === 'file' ? editJson(existing, step.edits) : ''
    expect(after).toContain('// local models')
    expect(after).toContain('"ollama"')
    expect(after).toContain('"zcf"')
  })

  it('expands a leading ~ in PI_CODING_AGENT_DIR, as pi does', async () => {
    const provider = { name: 'P', apiKey: 'k', openai: { baseUrl: 'https://o.example.com/v1', model: 'm' } }
    const paths = async (env: Record<string, string>, platform: NodeJS.Platform = 'linux') => {
      const plan = await pi.plan(config({ provider }), installed, context({ env, platform }))
      return plan.steps[0]!.kind === 'file' ? plan.steps[0]!.path : ''
    }
    expect(await paths({ PI_CODING_AGENT_DIR: '~/custom-pi' })).toBe('/home/me/custom-pi/models.json')
    expect(await paths({ PI_CODING_AGENT_DIR: '~' })).toBe('/home/me/models.json')
    expect(await paths({ PI_CODING_AGENT_DIR: '~\\pi' }, 'win32')).toBe('/home/me/pi/models.json')
    expect(await paths({ PI_CODING_AGENT_DIR: '~other/pi' })).toBe('~other/pi/models.json')
  })

  it('edits an existing zcf provider key by key, keeping model settings made in pi', async () => {
    const existing = JSON.stringify({
      providers: {
        zcf: {
          name: 'Old',
          baseUrl: 'https://old.example.com',
          api: 'anthropic-messages',
          apiKey: 'old',
          authHeader: true,
          compat: { thinkingFormat: 'deepseek' },
          models: [{ id: 'old-model', reasoning: true }],
        },
      },
    })
    const provider = { name: 'New', apiKey: 'k', openai: { baseUrl: 'https://o.example.com/v1', model: 'm' } }
    const plan = await pi.plan(config({ provider }), installed, context({}, { [`${AGENT}/models.json`]: existing }))
    const step = plan.steps[0]!
    const after = JSON.parse(step.kind === 'file' ? editJson(existing, step.edits) : '{}') as unknown
    expect(after).toEqual({
      providers: {
        zcf: {
          name: 'New',
          baseUrl: 'https://o.example.com/v1',
          api: 'openai-completions',
          apiKey: 'k',
          compat: { thinkingFormat: 'deepseek' },
          models: [{ id: 'old-model', reasoning: true }, { id: 'm' }],
        },
      },
    })

    const again = await pi.plan(
      config({ provider }),
      installed,
      context({}, { [`${AGENT}/models.json`]: JSON.stringify(after) }),
    )
    const settled = again.steps[0]!
    expect(settled.kind === 'file' ? editJson(JSON.stringify(after, null, 2), settled.edits) : '').toBe(
      `${JSON.stringify(after, null, 2)}\n`,
    )
  })

  it('keeps ${NAME} references in MCP values and every other $ or leading ! literal', async () => {
    const plan = await pi.plan(
      config({
        mcpServers: {
          s: { type: 'stdio', command: 'x', env: { A: '${TOKEN}', B: 'pa$$w', C: '!secret' } },
          h: { type: 'http', url: 'https://h.example.com/mcp', headers: { Authorization: 'Bearer ${TOKEN}' } },
        },
      }),
      installed,
      context(),
    )
    expect(plan.steps.map(step => (step.kind === 'command' ? step.args : []))).toEqual([
      ['mcp', 'add', 's', '--env', 'A=${TOKEN}', '--env', 'B=pa$$$$w', '--env', 'C=$!secret', '--', 'x'],
      ['mcp', 'add', 'h', '--url', 'https://h.example.com/mcp', '--header', 'Authorization=Bearer ${TOKEN}'],
    ])

    const stored = { mcpServers: { s: { command: 'x', env: { A: '${TOKEN}', B: 'pa$$$$w', C: '$!secret' } } } }
    const again = await pi.plan(
      config({ mcpServers: { s: { type: 'stdio', command: 'x', env: { A: '${TOKEN}', B: 'pa$$w', C: '!secret' } } } }),
      installed,
      context({}, { [`${AGENT}/mcp.json`]: JSON.stringify(stored) }),
    )
    expect(again.steps).toEqual([])
  })

  it('adds MCP servers with pi mcp add and skips the ones already in mcp.json', async () => {
    const files = {
      [`${AGENT}/mcp.json`]: JSON.stringify({
        mcpServers: {
          same: { command: 'npx', args: ['-y', 'same-mcp'], enabled: false },
          changed: { url: 'https://old.example.com/mcp' },
        },
      }),
    }
    const plan = await pi.plan(
      config({
        mcpServers: {
          same: { type: 'stdio', command: 'npx', args: ['-y', 'same-mcp'] },
          changed: { type: 'http', url: 'https://new.example.com/mcp', headers: { Authorization: 'Bearer a=b' } },
          fresh: { type: 'stdio', command: 'uvx', args: ['--from', 'x', 'x-mcp'], env: { TOKEN: 't' } },
        },
      }),
      installed,
      context({}, files),
    )
    expect(plan.steps).toEqual([
      {
        kind: 'command',
        title: { key: 'step.mcpAdd', params: { name: 'changed' } },
        command: 'pi',
        args: ['mcp', 'add', 'changed', '--url', 'https://new.example.com/mcp', '--header', 'Authorization=Bearer a=b'],
        touches: [`${AGENT}/mcp.json`],
      },
      {
        kind: 'command',
        title: { key: 'step.mcpAdd', params: { name: 'fresh' } },
        command: 'pi',
        args: ['mcp', 'add', 'fresh', '--env', 'TOKEN=t', '--', 'uvx', '--from', 'x', 'x-mcp'],
        touches: [`${AGENT}/mcp.json`],
      },
    ])
  })

  it('does not wrap npx on Windows, since pi spawns servers with cross-spawn', async () => {
    const plan = await pi.plan(
      config({ mcpServers: { fs: { type: 'stdio', command: 'npx', args: ['-y', 'fs-mcp'] } } }),
      installed,
      context({ platform: 'win32' }),
    )
    expect(plan.steps).toMatchObject([{ args: ['mcp', 'add', 'fs', '--', 'npx', '-y', 'fs-mcp'] }])
  })

  it('installs skills into the shared Agent Skills folder', async () => {
    const files = { [`${HOME}/.agents/skills/done/SKILL.md`]: '# done' }
    const plan = await pi.plan(
      config({
        skills: [
          { source: 'owner/done', skills: ['done'] },
          { source: 'owner/new', skills: ['new'] },
        ],
      }),
      installed,
      context({}, files),
    )
    expect(plan.steps).toEqual([
      {
        kind: 'command',
        title: { key: 'step.skillsAdd', params: { source: 'owner/new' } },
        command: 'npx',
        args: ['-y', 'skills', 'add', 'owner/new', '-g', '-y', '-a', 'pi', '-s', 'new'],
        serial: 'npx-skills',
      },
    ])
  })
})

describe('pi.planUpdate', () => {
  it("updates pi with pi's own updater", async () => {
    expect(await pi.planUpdate(installed, context())).toEqual({
      tool: 'pi',
      steps: [
        {
          kind: 'command',
          title: { key: 'step.update', params: { tool: 'pi' } },
          command: 'pi',
          args: ['update', '--self'],
        },
      ],
      notices: [],
    })
  })

  it('reports a missing install', async () => {
    expect((await pi.planUpdate({ installed: false, command: 'pi' }, context())).notices).toEqual([
      { level: 'info', message: { key: 'notice.notInstalled', params: { tool: 'pi' } } },
    ])
  })
})
