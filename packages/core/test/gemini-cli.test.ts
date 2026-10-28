import { parse } from 'jsonc-parser'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { geminiCli } from '../src/adapters/gemini-cli'
import type { AdapterContext } from '../src/adapters/types'
import { editDotenv, editJson } from '../src/io/editors'
import type { CommandStep, FileStep } from '../src/plan/types'
import type { ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner } from './helpers'

const HOME = '/home/me'
const SETTINGS = join(HOME, '.gemini', 'settings.json')
const ENV = join(HOME, '.gemini', '.env')

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

const installed = { installed: true, command: 'gemini', version: '0.65.0' }

function commandLines(steps: readonly unknown[]): string[] {
  return (steps as CommandStep[])
    .filter(step => step.kind === 'command')
    .map(step => [step.command, ...step.args].join(' '))
}

describe('geminiCli.detect', () => {
  it('finds gemini on PATH', async () => {
    const runner = fakeRunner({ 'gemini --version': { stdout: '0.65.0\n' } })
    expect(await geminiCli.detect(context({ runner }))).toEqual({
      installed: true,
      command: 'gemini',
      version: '0.65.0',
    })
  })

  it('reports a missing install', async () => {
    expect(await geminiCli.detect(context())).toEqual({ installed: false, command: 'gemini' })
  })
})

describe('geminiCli.plan', () => {
  it('installs from npm first when missing', async () => {
    const plan = await geminiCli.plan(config({}), { installed: false, command: 'gemini' }, context())
    expect(commandLines(plan.steps)).toEqual(['npm install -g @google/gemini-cli'])
  })

  it('does nothing for an empty config on an installed tool', async () => {
    expect(await geminiCli.plan(config({}), installed, context())).toEqual({
      tool: 'gemini-cli',
      steps: [],
      notices: [],
    })
  })

  it('says Gemini CLI has no setting of its own when the config language is Chinese', async () => {
    const plan = await geminiCli.plan(config({ configLanguage: 'zh-CN' }), installed, context())
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.languageNotSupported', params: { tool: 'gemini-cli', language: 'zh-CN' } },
      },
    ])
    // English is what every tool does on its own, so nothing is said or written.
    expect((await geminiCli.plan(config({ configLanguage: 'en' }), installed, context())).notices).toEqual([])
  })

  it('writes a gateway provider to ~/.gemini/.env and settings.json', async () => {
    const plan = await geminiCli.plan(
      config({
        provider: {
          name: 'Gateway',
          apiKey: 'sk-secret',
          gemini: { baseUrl: 'https://gw.example.com', model: 'gemini-3-pro' },
        },
      }),
      installed,
      context(),
    )
    expect(plan.notices).toEqual([])
    const [env, settings] = plan.steps as FileStep[]
    expect(env).toMatchObject({ kind: 'file', path: ENV, format: 'env' })
    expect(settings).toMatchObject({ kind: 'file', path: SETTINGS, format: 'json' })

    expect(editDotenv('# mine\nOTHER=1\nGEMINI_MODEL=old\nGEMINI_API_KEY=old\n', env!.edits)).toBe(
      '# mine\nOTHER=1\nGEMINI_API_KEY=sk-secret\nGOOGLE_GEMINI_BASE_URL=https://gw.example.com\n',
    )
    const after = editJson(
      '{\n  // mine\n  "security": { "auth": { "selectedType": "oauth-personal" } },\n  "ui": {}\n}\n',
      settings!.edits,
    )
    expect(after).toContain('// mine')
    expect(parse(after)).toEqual({
      security: { auth: { selectedType: 'gemini-api-key' } },
      ui: {},
      model: { name: 'gemini-3-pro' },
    })
  })

  it('removes a stale base URL for the official endpoint', async () => {
    const plan = await geminiCli.plan(
      config({ provider: { name: 'Google', apiKey: 'AIza-key', gemini: {} } }),
      installed,
      context(),
    )
    const [env, settings] = plan.steps as FileStep[]
    expect(editDotenv('GOOGLE_GEMINI_BASE_URL=https://old.example.com\nGEMINI_MODEL=keep\n', env!.edits)).toBe(
      'GEMINI_MODEL=keep\nGEMINI_API_KEY=AIza-key\n',
    )
    expect(JSON.parse(editJson(undefined, settings!.edits))).toEqual({
      security: { auth: { selectedType: 'gemini-api-key' } },
    })
  })

  it('takes the model from models.default when the gemini block has none', async () => {
    const plan = await geminiCli.plan(
      config({ provider: { name: 'P', apiKey: 'k', gemini: {}, models: { default: 'gemini-2.5-flash' } } }),
      installed,
      context(),
    )
    expect((plan.steps[1] as FileStep).edits).toContainEqual({ path: ['model', 'name'], value: 'gemini-2.5-flash' })
  })

  it('warns when the provider has no Gemini settings', async () => {
    const plan = await geminiCli.plan(
      config({ provider: { name: 'O', apiKey: 'k', openai: { baseUrl: 'https://example.com/v1' } } }),
      installed,
      context(),
    )
    expect(plan.steps).toEqual([])
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.providerMissingProtocol', params: { tool: 'gemini-cli', protocol: 'gemini' } },
      },
    ])
  })

  it('follows GEMINI_CLI_HOME for settings and .env', async () => {
    const plan = await geminiCli.plan(
      config({ provider: { name: 'P', apiKey: 'k', gemini: {} } }),
      installed,
      context({ env: { GEMINI_CLI_HOME: '/data/g' } }),
    )
    expect(plan.steps.map(step => step.kind === 'file' && step.path)).toEqual([
      join('/data/g', '.gemini', '.env'),
      join('/data/g', '.gemini', 'settings.json'),
    ])
  })

  it('adds MCP servers in user scope, skipping identical ones and writing env and headers to the file', async () => {
    const files = {
      [SETTINGS]: JSON.stringify({
        mcpServers: {
          same: { command: 'uvx', args: ['same'], trust: true },
          legacy: { httpUrl: 'https://legacy.example.com' },
          changed: { url: 'https://old.example.com', type: 'http' },
        },
      }),
    }
    const plan = await geminiCli.plan(
      config({
        mcpServers: {
          same: { type: 'stdio', command: 'uvx', args: ['same'] },
          legacy: { type: 'http', url: 'https://legacy.example.com' },
          changed: { type: 'http', url: 'https://new.example.com', headers: { Authorization: 'Bearer t' } },
          fresh: { type: 'stdio', command: 'npx', args: ['-y', 'pkg'], env: { TOKEN: 'abc==' } },
          bare: { type: 'stdio', command: 'my-server' },
        },
      }),
      installed,
      context({ platform: 'win32' }, files),
    )

    expect(
      plan.steps.map(step =>
        step.kind === 'command'
          ? step.args.join(' ')
          : step.kind === 'remove'
            ? step.path
            : step.kind === 'file'
              ? step.edits
              : step.to,
      ),
    ).toEqual([
      'mcp add -s user -t http changed https://new.example.com',
      [{ path: ['mcpServers', 'changed', 'headers'], value: { Authorization: 'Bearer t' } }],
      'mcp add -s user fresh npx -- -y pkg',
      [{ path: ['mcpServers', 'fresh', 'env'], value: { TOKEN: 'abc==' } }],
      'mcp add -s user bare my-server',
    ])
    expect(plan.steps).toMatchObject([
      { kind: 'command', touches: [SETTINGS] },
      { kind: 'file', path: SETTINGS, title: { key: 'step.mcpHeaders' } },
      { kind: 'command' },
      { kind: 'file', path: SETTINGS, title: { key: 'step.mcpEnv' } },
      { kind: 'command' },
    ])
  })

  it('installs skills for gemini-cli unless they are already in ~/.agents/skills, where the skills CLI puts them', async () => {
    const plan = await geminiCli.plan(
      config({
        skills: [
          { source: 'owner/done', skills: ['present'] },
          { source: 'owner/new', skills: ['absent'] },
        ],
      }),
      installed,
      context(
        { env: { GEMINI_CLI_HOME: '/elsewhere' } },
        { [join(HOME, '.agents', 'skills', 'present', 'SKILL.md')]: '#' },
      ),
    )
    expect(commandLines(plan.steps)).toEqual(['npx -y skills add owner/new -g -y -a gemini-cli -s absent'])
  })
})

describe('geminiCli.planUpdate', () => {
  it('updates through npm, since Gemini CLI has no update command', async () => {
    expect(commandLines((await geminiCli.planUpdate(installed, context())).steps)).toEqual([
      'npm install -g @google/gemini-cli@latest',
    ])
  })

  it('only notes a missing install', async () => {
    expect((await geminiCli.planUpdate({ installed: false, command: 'gemini' }, context())).notices).toEqual([
      { level: 'info', message: { key: 'notice.notInstalled', params: { tool: 'gemini-cli' } } },
    ])
  })
})
