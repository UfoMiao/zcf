import { parse } from 'jsonc-parser'
import { join } from 'pathe'
import { describe, expect, it } from 'vitest'

import { opencode } from '../src/adapters/opencode'
import type { AdapterContext } from '../src/adapters/types'
import { editJson } from '../src/io/editors'
import type { CommandStep, FileStep } from '../src/plan/types'
import type { ZcfConfig, ZcfConfigInput } from '../src/schema/config'
import { parseZcfConfig } from '../src/schema/config'
import { fakeRunner } from './helpers'

const HOME = '/home/me'
const CONFIG = join(HOME, '.config', 'opencode', 'opencode.json')

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

/** Apply every file step of a plan in order, as `applyPlan` would. */
function written(steps: readonly unknown[], before?: string): unknown {
  let text = before
  for (const step of steps as FileStep[]) if (step.kind === 'file') text = editJson(text, step.edits)
  return text === undefined ? undefined : parse(text, [], { allowTrailingComma: true })
}

const installed = { installed: true, command: 'opencode', version: '1.19.4' }

describe('opencode.detect', () => {
  it('finds opencode on PATH', async () => {
    const runner = fakeRunner({ 'opencode --version': { stdout: '1.19.4\n' } })
    expect(await opencode.detect(context({ runner }))).toEqual({
      installed: true,
      command: 'opencode',
      version: '1.19.4',
    })
  })

  it("falls back to the install script's folder", async () => {
    const runner = fakeRunner({ '/home/me/.opencode/bin/opencode --version': { stdout: '1.19.4' } })
    expect(await opencode.detect(context({ runner }))).toMatchObject({ command: '/home/me/.opencode/bin/opencode' })
    expect(await opencode.detect(context())).toEqual({ installed: false, command: 'opencode' })
  })

  it('looks for opencode.exe on Windows and installs it with npm when missing', async () => {
    const home = 'C:/Users/me'
    const exe = 'C:/Users/me/.opencode/bin/opencode.exe'
    const runner = fakeRunner({ [`${exe} --version`]: { stdout: '1.19.4' } })
    const win = context({ home, platform: 'win32', runner })
    expect(await opencode.detect(win)).toMatchObject({ installed: true, command: exe })

    const plan = await opencode.plan(config({ tools: ['opencode'] }), { installed: false, command: 'opencode' }, win)
    expect((plan.steps as CommandStep[]).map(step => [step.command, ...step.args])).toEqual([
      ['npm', 'install', '-g', '--allow-scripts=opencode-ai', 'opencode-ai'],
      ['opencode', '--version'],
    ])
  })
})

describe('opencode.plan', () => {
  it('installs with npm when missing and does nothing else for an empty config', async () => {
    const plan = await opencode.plan(config({}), { installed: false, command: 'opencode' }, context())
    expect(plan.steps).toEqual([
      {
        kind: 'command',
        title: { key: 'step.install', params: { tool: 'opencode' } },
        command: 'npm',
        // npm 12 skips the postinstall that puts the binary in place unless it is allowed.
        args: ['install', '-g', '--allow-scripts=opencode-ai', 'opencode-ai'],
      },
      {
        kind: 'command',
        title: { key: 'step.verify', params: { tool: 'opencode' } },
        command: 'opencode',
        args: ['--version'],
      },
    ])
    expect(await opencode.plan(config({}), installed, context())).toEqual({ tool: 'opencode', steps: [], notices: [] })
  })

  it('says OpenCode has no setting of its own when the config language is Chinese', async () => {
    const plan = await opencode.plan(config({ configLanguage: 'zh-CN' }), installed, context())
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.languageNotSupported', params: { tool: 'opencode', language: 'zh-CN' } },
      },
    ])
    // English is what every tool does on its own, so nothing is said or written.
    expect((await opencode.plan(config({ configLanguage: 'en' }), installed, context())).notices).toEqual([])
  })

  it('adds an Anthropic provider with the version in the base URL and a bearer token', async () => {
    const plan = await opencode.plan(
      config({
        provider: {
          name: 'GLM',
          apiKey: 'secret',
          anthropic: { baseUrl: 'https://example.com/anthropic/' },
          models: { default: 'glm-4.7', haiku: 'glm-4.5-air' },
        },
      }),
      installed,
      context(),
    )
    expect(plan.notices).toEqual([])
    expect(plan.steps).toMatchObject([{ kind: 'file', path: CONFIG, title: { key: 'step.provider' } }])
    expect(written(plan.steps)).toEqual({
      $schema: 'https://opencode.ai/config.json',
      provider: {
        zcf: {
          npm: '@ai-sdk/anthropic',
          name: 'GLM',
          options: { baseURL: 'https://example.com/anthropic/v1', authToken: 'secret' },
          models: { 'glm-4.7': {}, 'glm-4.5-air': {} },
        },
      },
      model: 'zcf/glm-4.7',
      small_model: 'zcf/glm-4.5-air',
    })
  })

  it('picks the first tier model when the provider has no default', async () => {
    const plan = await opencode.plan(
      config({
        provider: {
          name: 'GLM',
          apiKey: 'k',
          anthropic: { baseUrl: 'https://example.com/anthropic' },
          models: { sonnet: 'glm-4.7', haiku: 'glm-4.5-air' },
        },
      }),
      installed,
      context(),
    )
    expect(plan.notices).toEqual([])
    expect(written(plan.steps)).toMatchObject({ model: 'zcf/glm-4.7', small_model: 'zcf/glm-4.5-air' })
  })

  it('sends api_key providers as an API key and keeps a version already in the URL', async () => {
    const plan = await opencode.plan(
      config({
        provider: {
          name: 'Anthropic',
          apiKey: 'sk-ant',
          anthropic: { baseUrl: 'https://api.anthropic.com/v1/', authType: 'api_key' },
          models: { default: 'claude-sonnet-5-5' },
        },
      }),
      installed,
      context(),
    )
    expect(written(plan.steps)).toMatchObject({
      provider: { zcf: { options: { baseURL: 'https://api.anthropic.com/v1', apiKey: 'sk-ant' } } },
    })
  })

  it('uses the OpenAI-compatible endpoint when only it names a model, keeping the rest of the file and model settings', async () => {
    const before = [
      '// my settings',
      '{',
      '  "theme": "dark",',
      '  "model": "anthropic/claude-sonnet-5-5",',
      '  "small_model": "zcf/old",',
      '  "provider": {',
      '    "zcf": {',
      '      "options": { "authToken": "old" },',
      '      "models": { "gpt-6": { "limit": { "context": 400000, "output": 128000 } }, "gone": {} },',
      '    },',
      '    "other": {},',
      '  },',
      '}',
      '',
    ].join('\n')
    const plan = await opencode.plan(
      config({
        provider: {
          name: 'Router',
          apiKey: 'sk-or',
          anthropic: { baseUrl: 'https://router.example.com' },
          openai: { baseUrl: 'https://router.example.com/v1', model: 'gpt-6' },
        },
      }),
      installed,
      context({}, { [CONFIG]: before }),
    )
    expect(editJson(before, (plan.steps[0] as FileStep).edits).startsWith('// my settings\n')).toBe(true)
    expect(written(plan.steps, before)).toEqual({
      theme: 'dark',
      model: 'zcf/gpt-6',
      provider: {
        zcf: {
          npm: '@ai-sdk/openai-compatible',
          name: 'Router',
          options: { baseURL: 'https://router.example.com/v1', apiKey: 'sk-or' },
          models: { 'gpt-6': { limit: { context: 400000, output: 128000 } } },
        },
        other: {},
      },
    })
  })

  it('warns about a missing model and drops a stale pick of the ZCF provider', async () => {
    const before = '{ "model": "zcf/gone" }'
    const plan = await opencode.plan(
      config({ provider: { name: 'p', apiKey: 'k', openai: { baseUrl: 'https://api.example.com/v1' } } }),
      installed,
      context({}, { [CONFIG]: before }),
    )
    expect(plan.notices).toEqual([
      { level: 'warning', message: { key: 'notice.modelMissing', params: { tool: 'opencode', protocol: 'openai' } } },
    ])
    expect(written(plan.steps, before)).not.toHaveProperty('model')
  })

  it('keeps the current provider when the config has no protocol OpenCode speaks', async () => {
    const plan = await opencode.plan(
      config({ provider: { name: 'g', apiKey: 'k', gemini: { model: 'gemini-3-pro' } } }),
      installed,
      context(),
    )
    expect(plan.steps).toEqual([])
    expect(plan.notices).toEqual([
      {
        level: 'warning',
        message: { key: 'notice.providerMissingProtocol', params: { tool: 'opencode', protocol: 'anthropic/openai' } },
      },
    ])
  })

  it('writes MCP servers into an existing opencode.jsonc under XDG_CONFIG_HOME, keeping settings ZCF does not manage', async () => {
    const path = '/xdg/opencode/opencode.jsonc'
    const before = JSON.stringify({
      mcp: {
        keep: { type: 'remote', url: 'https://keep.example.com' },
        docs: { type: 'remote', url: 'https://old.example.com', oauth: { clientId: 'id' }, timeout: 5000 },
        local: { type: 'remote', url: 'https://was-remote.example.com', oauth: { clientId: 'id' } },
      },
    })
    const plan = await opencode.plan(
      config({
        mcpServers: {
          docs: { type: 'http', url: 'https://docs.example.com/mcp', headers: { Authorization: 'Bearer t' } },
          local: { type: 'stdio', command: 'npx', args: ['-y', 'pkg'], env: { TOKEN: 't' } },
          bare: { type: 'stdio', command: 'uvx', args: ['tool'] },
        },
      }),
      installed,
      context({ env: { XDG_CONFIG_HOME: '/xdg' } }, { [path]: before, [CONFIG]: '{}' }),
    )
    expect(plan.steps).toMatchObject([
      { kind: 'file', path, title: { key: 'step.mcpAdd', params: { name: 'docs' } } },
      { kind: 'file', path, title: { key: 'step.mcpAdd', params: { name: 'local' } } },
      { kind: 'file', path, title: { key: 'step.mcpAdd', params: { name: 'bare' } } },
    ])
    expect(written(plan.steps, before)).toEqual({
      mcp: {
        keep: { type: 'remote', url: 'https://keep.example.com' },
        docs: {
          type: 'remote',
          url: 'https://docs.example.com/mcp',
          oauth: { clientId: 'id' },
          timeout: 5000,
          headers: { Authorization: 'Bearer t' },
          enabled: true,
        },
        local: { type: 'local', command: ['npx', '-y', 'pkg'], environment: { TOKEN: 't' }, enabled: true },
        bare: { type: 'local', command: ['uvx', 'tool'], enabled: true },
      },
    })
  })

  it('leaves a hand-formatted entry that already matches as it is', async () => {
    const before =
      '{\n\t"mcp": {\n\t\t"a": { "type": "local", "command": ["npx", "-y", "pkg"], "environment": { "K": "v" }, "enabled": true, "timeout": 9 }\n\t}\n}\n'
    const plan = await opencode.plan(
      config({ mcpServers: { a: { type: 'stdio', command: 'npx', args: ['-y', 'pkg'], env: { K: 'v' } } } }),
      installed,
      context({}, { [CONFIG]: before }),
    )
    expect(editJson(before, (plan.steps[0] as FileStep).edits)).toBe(before)
  })

  it('installs skills for opencode unless the named ones are present', async () => {
    const plan = await opencode.plan(
      config({
        skills: [
          { source: 'owner/a', skills: ['one'] },
          { source: 'owner/b', skills: ['two'] },
        ],
      }),
      installed,
      // The skills CLI installs OpenCode's global skills into the shared ~/.agents/skills.
      context({}, { [join(HOME, '.agents', 'skills', 'one', 'SKILL.md')]: '# one' }),
    )
    expect((plan.steps as CommandStep[]).map(step => [step.command, ...step.args].join(' '))).toEqual([
      'npx -y skills add owner/b -g -y -a opencode -s two',
    ])
  })
})

describe('opencode.planUpdate', () => {
  it('runs opencode upgrade, or notes a missing install', async () => {
    expect((await opencode.planUpdate(installed, context())).steps).toMatchObject([
      { command: 'opencode', args: ['upgrade'] },
    ])
    expect((await opencode.planUpdate({ installed: false, command: 'opencode' }, context())).notices).toMatchObject([
      { message: { key: 'notice.notInstalled' } },
    ])
  })
})
